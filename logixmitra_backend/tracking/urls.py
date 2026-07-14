from django.urls import path

from tracking.views import TrackingCronView

urlpatterns = [
    path("cron/run", TrackingCronView.as_view(), name="tracking-cron-run"),
]
