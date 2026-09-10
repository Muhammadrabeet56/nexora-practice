"""Day 001 tests — written WITH the code, per Google review standards."""

from src.scheduler import Slot, Scheduler


def make_slot(date="2026-09-11", hour=10, minute=0) -> Slot:
    return Slot(date=date, hour=hour, minute=minute)


class TestSlot:
    def test_key_is_stable(self):
        assert make_slot().key() == "2026-09-11T10:00"

    def test_slots_with_same_time_share_key(self):
        assert make_slot().key() == Slot("2026-09-11", 10, 0).key()


class TestScheduler:
    def test_book_free_slot_succeeds(self):
        s = Scheduler()
        assert s.book(make_slot()) is True

    def test_double_booking_fails(self):
        s = Scheduler()
        s.book(make_slot())
        assert s.book(make_slot()) is False

    def test_is_free_before_and_after_booking(self):
        s = Scheduler()
        slot = make_slot()
        assert s.is_free(slot)
        s.book(slot)
        assert not s.is_free(slot)

    def test_free_slots_lists_chronologically(self):
        s = Scheduler()
        s.book(make_slot(hour=9, minute=30))
        free = s.free_slots("2026-09-11")
        keys = [x.key() for x in free]
        assert keys == sorted(keys)                      # chronological
        assert "2026-09-11T09:30" not in keys            # booked one excluded
        assert "2026-09-11T09:00" in keys                # first of the day present


class TestCancel:
    def test_cancel_booked_slot_frees_it(self):
        s = Scheduler()
        slot = make_slot()
        s.book(slot)
        assert s.cancel(slot) is True
        assert s.is_free(slot)

    def test_cancel_never_booked_slot_fails(self):
        s = Scheduler()
        assert s.cancel(make_slot()) is False

    def test_cancel_twice_fails_second_time(self):
        s = Scheduler()
        slot = make_slot()
        s.book(slot)
        s.cancel(slot)
        assert s.cancel(slot) is False

    def test_cancel_then_rebook_works(self):
        s = Scheduler()
        slot = make_slot()
        s.book(slot)
        s.cancel(slot)
        assert s.book(slot) is True
