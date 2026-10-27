from django.test import SimpleTestCase, TestCase

from orders.models import Order
from orders.status_utils import (
    STATUS_CHIP_FILTERS,
    apply_status_filter,
    compute_status_chip_counts,
)


class StatusUtilsLogicTests(SimpleTestCase):
    def test_ndr_aliases_are_grouped(self):
        q = STATUS_CHIP_FILTERS["UNDELIVERED"]
        # Q objects are not directly evaluable without DB; ensure key exists and is Q-like
        self.assertTrue(hasattr(q, "children") or hasattr(q, "connector"))

    def test_chip_keys_cover_toolbar(self):
        expected = {
            "Pending",
            "READY FOR DISPATCH",
            "Out for Pickup",
            "In Transit",
            "Out for Delivery",
            "Delivered",
            "UNDELIVERED",
            "RTO In transit",
            "RTO Delivered",
            "Cancelled",
        }
        self.assertEqual(set(STATUS_CHIP_FILTERS.keys()), expected)


class StatusUtilsDbTests(TestCase):
    def setUp(self):
        samples = [
            ("Pending", "Pending"),
            ("NDR1", "UNDELIVERED"),
            ("NDR2", "NDR"),
            ("NDR3", "Failed Delivery"),
            ("RTO1", "RTO In transit"),
            ("RTO2", "RTO Initiated"),
            ("RTOD", "RTO Delivered"),
            ("RTOO", "Return to Origin"),
            ("DEL", "Delivered"),
            ("CAN", "Cancelled"),
        ]
        for i, (num, status) in enumerate(samples):
            Order.objects.create(
                order_number=f"TST-{num}-{i}",
                customer_name="Test",
                customer_phone="9999999999",
                status=status,
                amount="100",
            )

    def test_ndr_filter_count_matches_list(self):
        qs = Order.objects.all()
        counts = compute_status_chip_counts(qs)
        ndr_qs = apply_status_filter(qs, "UNDELIVERED")
        self.assertEqual(counts["UNDELIVERED"], ndr_qs.count())
        self.assertEqual(ndr_qs.count(), 3)

    def test_pagination_page_size_stable(self):
        from rest_framework.test import APIRequestFactory
        from orders.views import OrderListCreateView

        factory = APIRequestFactory()
        request = factory.get("/api/orders", {"status": "UNDELIVERED", "page": 1, "limit": 2, "paginate": "true"})
        response = OrderListCreateView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 2)
        self.assertEqual(response.data["pagination"]["total"], 3)
        self.assertEqual(response.data["pagination"]["totalPages"], 2)
        self.assertEqual(response.data["statusCounts"]["UNDELIVERED"], 3)

        request2 = factory.get("/api/orders", {"status": "UNDELIVERED", "page": 2, "limit": 2, "paginate": "true"})
        response2 = OrderListCreateView.as_view()(request2)
        self.assertEqual(len(response2.data["data"]), 1)
