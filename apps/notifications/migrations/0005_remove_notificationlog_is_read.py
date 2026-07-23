"""Remove the is_read field from NotificationLog.

NotificationLog tracks email delivery attempts (sent/failed). The is_read
field was added by mistake — it belongs on the Notification model (in-app
notifications), not on the email delivery log.
"""
from __future__ import annotations

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0004_merge_20260719_0920"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="notificationlog",
            name="is_read",
        ),
    ]
