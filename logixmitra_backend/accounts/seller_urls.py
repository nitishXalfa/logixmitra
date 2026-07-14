from django.urls import path

from accounts.seller_views import SellerListView

urlpatterns = [
    path("", SellerListView.as_view(), name="sellers-list"),
]
