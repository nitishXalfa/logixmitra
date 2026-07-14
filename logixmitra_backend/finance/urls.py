from django.urls import path

from finance.views import WalletByUserView, WalletCreateView, WalletDeleteView, WalletListView, WalletStatusView

urlpatterns = [
    path("create", WalletCreateView.as_view(), name="wallet-create"),
    path("", WalletListView.as_view(), name="wallet-list"),
    path("users/<int:pk>", WalletByUserView.as_view(), name="wallet-by-user"),
    path("status/<int:pk>", WalletStatusView.as_view(), name="wallet-status"),
    path("<int:pk>", WalletDeleteView.as_view(), name="wallet-delete"),
]
