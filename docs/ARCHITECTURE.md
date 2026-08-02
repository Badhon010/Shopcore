# ShopCore — Architecture Overview

## System Context

```mermaid
C4Context
    title ShopCore System Context

    Person(customer, "Customer", "Browses products, places orders")
    Person(staff, "Store Staff", "Manages inventory, transitions orders")
    Person(dev, "Developer", "Builds frontend on top of frozen API")

    System(shopcore, "ShopCore API", "Django REST API — products, cart, checkout, orders, payments")
    System_Ext(smtp, "SMTP Relay", "SendGrid / Mailgun / SES — transactional email")
    System_Ext(payment, "Payment Gateway", "Stripe / SSLCommerz / bKash (stubs in v1.0.0)")
    System(store_fe, "frontend-store", "React / Vite / Tailwind — customer SPA")
    System(admin_fe, "frontend-admin", "React / Vite / Tailwind — staff SPA")

    Rel(customer, store_fe, "Uses")
    Rel(staff, admin_fe, "Manages store via")
    Rel(store_fe, shopcore, "REST / JSON over HTTPS")
    Rel(admin_fe, shopcore, "REST / JSON over HTTPS")
    Rel(shopcore, smtp, "Sends transactional email")
    Rel(shopcore, payment, "Initiates payment, receives webhooks")
    Rel(dev, shopcore, "Reads API docs, builds frontend")
```

---

## Application Architecture

```mermaid
flowchart TB
    subgraph Client["REST Clients"]
        Browser["Browser / SPA"]
        Mobile["Mobile App"]
        Admin["frontend-admin\n(Staff SPA)"]
    end

    subgraph API["ShopCore API (Django / DRF)"]
        direction TB
        Auth["JWT Auth\n(SimpleJWT + Blacklist)"]
        Throttle["Rate Limiting\n(DRF Throttle)"]

        subgraph Apps["Application Layer"]
            Accounts["accounts\nUsers · Addresses\nPassword Reset"]
            Catalog["catalog\nProducts · Variants\nCategories · Brands\nFull-text Search"]
            Cart["cart\nCart · CartItems\nGuest→User Merge"]
            Orders["orders\nCheckout · Order SM\nStatus History"]
            Inventory["inventory\nStock · Reservations\nMovements"]
            Payments["payments\nInitiate · Webhooks\nGateway Abstraction"]
            Coupons["coupons\nValidation · Redemption"]
            Reviews["reviews"]
            Wishlist["wishlist"]
            Notifications["notifications\nTransactional Email\nNotification Log"]
        end

        subgraph Infra["Infrastructure Layer"]
            ExcHandler["Custom Exception\nHandler"]
            ReqId["Request-ID\nMiddleware"]
            Schema["OpenAPI Schema\n(drf-spectacular)"]
        end
    end

    subgraph Storage["Persistence"]
        PG[("PostgreSQL\nPrimary store\nFull-text search\nRow-level locking")]
        Redis[("Redis\nCategory tree cache\nDjango cache")]
    end

    subgraph External["External Services"]
        SMTP["SMTP Relay"]
        Gateway["Payment Gateway"]
    end

    Client -->|HTTPS JSON| Auth
    Auth --> Throttle
    Throttle --> Apps
    Apps --> PG
    Apps --> Redis
    Notifications -->|Synchronous| SMTP
    Payments --> Gateway

    style PG fill:#336791,color:#fff
    style Redis fill:#dc382d,color:#fff
    style SMTP fill:#f5a623,color:#fff
    style Gateway fill:#00a862,color:#fff
```

---

## Request Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware Stack
    participant Auth as JWT Auth
    participant Throttle as Throttle
    participant View as View / Serializer
    participant Service as Service Layer
    participant DB as PostgreSQL

    C->>MW: POST /api/orders/checkout/ {Bearer token}
    MW->>MW: RequestIdMiddleware → attach X-Request-ID
    MW->>Auth: authenticate(request)
    Auth->>DB: SELECT OutstandingToken WHERE jti=...
    DB-->>Auth: token valid
    Auth-->>MW: user = <User>
    MW->>Throttle: check_throttles(user)
    Throttle-->>MW: ok (rate limit not exceeded)
    MW->>View: CheckoutView.post(request)
    View->>View: CheckoutSerializer.is_valid()
    Note over View: Validates address ownership,\ncoupon validity, idempotency key
    View->>Service: place_order(user, validated_data)
    Service->>DB: BEGIN transaction
    Service->>DB: SELECT FOR UPDATE stock_items WHERE variant IN (...)
    Service->>DB: INSERT Order, OrderItems
    Service->>DB: UPDATE StockItem quantity_reserved++
    Service->>DB: INSERT StockMovement (RESERVATION)
    DB-->>Service: ok
    Service->>DB: COMMIT
    Service->>View: order
    View->>Service: send_order_confirmation_email(order) [sync, in-thread]
    Service->>C: 201 {order_number, status, ...}
```

---

## Order Status Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /checkout

    PENDING --> CONFIRMED : Staff confirms
    PENDING --> AWAITING_PAYMENT : Payment initiated
    PENDING --> CANCELLED : User cancels / timeout

    AWAITING_PAYMENT --> CONFIRMED : Payment webhook received
    AWAITING_PAYMENT --> CANCELLED : Payment failed / timeout

    CONFIRMED --> PROCESSING : Staff begins fulfilment
    PROCESSING --> SHIPPED : Staff marks shipped
    SHIPPED --> DELIVERED : Staff marks delivered
    DELIVERED --> REFUNDED : Staff issues refund

    CANCELLED --> [*]
    REFUNDED --> [*]

    note right of PENDING
        Stock reserved at checkout.
        Idempotency key prevents duplicates.
    end note

    note right of CANCELLED
        Stock reservation released.
        transaction.atomic() rolls back
        on any inventory failure.
    end note
```

---

## Inventory Reservation Flow

```mermaid
flowchart LR
    A["POST /checkout"] --> B["BEGIN transaction.atomic()"]
    B --> C["SELECT FOR UPDATE\nstockitem WHERE variant IN items"]
    C --> D{Enough stock?}
    D -- No --> E["ROLLBACK\n→ 400 INSUFFICIENT_STOCK"]
    D -- Yes --> F["INSERT Order + OrderItems"]
    F --> G["UPDATE stockitem\nqty_reserved += ordered_qty"]
    G --> H["INSERT StockMovement\n(RESERVATION)"]
    H --> I["COMMIT"]
    I --> J["Order status: PENDING"]

    J --> K{Payment received?}
    K -- Yes --> L["transition PENDING → CONFIRMED"]
    L --> M["BEGIN transaction.atomic()"]
    M --> N["SELECT FOR UPDATE stockitem"]
    N --> O["UPDATE stockitem\nqty_available -= ordered_qty\nqty_reserved -= ordered_qty"]
    O --> P["INSERT StockMovement\n(SALE)"]
    P --> Q["COMMIT — stock committed"]

    K -- No/Timeout --> R["transition → CANCELLED"]
    R --> S["BEGIN transaction.atomic()"]
    S --> T["UPDATE stockitem\nqty_reserved -= ordered_qty"]
    T --> U["COMMIT — stock released"]
```

---

## Authentication Flow (JWT with Device Logout)

```mermaid
sequenceDiagram
    participant C as Client
    participant API as ShopCore API
    participant DB as Token Blacklist (PostgreSQL)

    Note over C,DB: Login
    C->>API: POST /accounts/login/ {email, password}
    API->>DB: INSERT OutstandingToken (jti, user, exp)
    API-->>C: {access: "eyJ...", refresh: "eyJ..."}

    Note over C,DB: Normal request
    C->>API: GET /orders/ {Authorization: Bearer access_token}
    API->>API: Verify JWT signature + expiry (no DB hit)
    API-->>C: 200 orders

    Note over C,DB: Refresh
    C->>API: POST /token/refresh/ {refresh: "eyJ..."}
    API->>DB: INSERT BlacklistedToken (old refresh)
    API->>DB: INSERT OutstandingToken (new refresh jti)
    API-->>C: {access: "new...", refresh: "new..."}

    Note over C,DB: Password change — all devices logged out
    C->>API: POST /me/change-password/ {current, new}
    API->>DB: SELECT OutstandingToken WHERE user=X
    loop each token
        API->>DB: INSERT BlacklistedToken (token)
    end
    API-->>C: 200 Password changed

    Note over C,DB: Other device tries to use old refresh
    C2->>API: POST /token/refresh/ {refresh: "old_eyJ..."}
    API->>DB: SELECT BlacklistedToken WHERE token=...
    DB-->>API: found — blacklisted
    API-->>C2: 401 Token is blacklisted
```

---

## Deployment Topology (Production)

```mermaid
flowchart TB
    subgraph Internet
        LB["Load Balancer / Reverse Proxy\n(nginx / Replit edge)"]
    end

    subgraph AppTier["Application Tier"]
        G1["gunicorn worker 1\n(gthread, 2 threads)"]
        G2["gunicorn worker 2\n(gthread, 2 threads)"]
        G3["gunicorn worker N"]
    end

    subgraph DataTier["Data Tier"]
        PG[("PostgreSQL\nPrimary + optional replica")]
        Redis[("Redis\nCache")]
    end

    subgraph ExternalServices["External Services"]
        SMTP["SMTP Relay\n(SendGrid / Mailgun)"]
        Pay["Payment Gateway\n(Stripe / bKash)"]
    end

    LB --> G1
    LB --> G2
    LB --> G3

    G1 & G2 & G3 --> PG
    G1 & G2 & G3 --> Redis
    G1 & G2 & G3 -->|sync, in-thread| SMTP
    G1 & G2 & G3 --> Pay

    style PG fill:#336791,color:#fff
    style Redis fill:#dc382d,color:#fff
```

> **Known limitation:** Email is sent synchronously in the worker thread. Under
> load, SMTP latency can block all workers. The code is structured for easy Celery
> migration (all notification functions accept plain arguments). This is tracked as
> M-4 in `PRODUCTION_READINESS_AUDIT_4.md`.
