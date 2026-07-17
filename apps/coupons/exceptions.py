from __future__ import annotations
from apps.common.exceptions import AppBaseException


class CouponNotFoundError(AppBaseException):
    code = "COUPON_NOT_FOUND"
    default_message = "Coupon not found."
    status_code = 404


class CouponInvalidError(AppBaseException):
    code = "COUPON_INVALID"
    default_message = "This coupon is not valid."
    status_code = 400


class CouponExpiredError(AppBaseException):
    code = "COUPON_EXPIRED"
    default_message = "This coupon has expired."
    status_code = 400


class CouponLimitReachedError(AppBaseException):
    code = "COUPON_LIMIT_REACHED"
    default_message = "This coupon has reached its usage limit."
    status_code = 400


class CouponMinimumOrderError(AppBaseException):
    code = "COUPON_MINIMUM_ORDER"
    default_message = "Order total does not meet the minimum for this coupon."
    status_code = 400
