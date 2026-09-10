"""
Nexora practice — Day 001.
Appointment scheduling core. Deliberately minimal: the point is
practicing Google's review standards (design, complexity, tests, naming).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Slot:
    """A bookable 30-minute slot. Immutable because booked state lives in Scheduler."""
    date: str        # ISO format "2026-09-11"
    hour: int        # 0-23, start of the 30-min slot
    minute: int      # 0 or 30

    def key(self) -> str:
        """Stable string identity for set membership."""
        return f"{self.date}T{self.hour:02d}:{self.minute:02d}"


class Scheduler:
    """Tracks booked slots and refuses double-booking.

    Why a class (not free functions): booking state must be shared and
    consistent — a class gives one owner of that state.
    """

    def __init__(self) -> None:
        self._booked: set[str] = set()

    def book(self, slot: Slot) -> bool:
        """Book a slot. Returns False (and changes nothing) if taken.

        Atomic by construction: the check and add happen on one set.
        """
        key = slot.key()
        if key in self._booked:
            return False
        self._booked.add(key)
        return True

    def cancel(self, slot: Slot) -> bool:
        """Cancel a booked slot. Returns False (and changes nothing) if not booked.

        Symmetric with book(): single-set operation, therefore atomic.
        """
        if slot.key() in self._booked:
            self._booked.remove(slot.key())
            return True
        return False

    def is_free(self, slot: Slot) -> bool:
        """True if the slot can still be booked."""
        return slot.key() not in self._booked

    def free_slots(self, date: str) -> list[Slot]:
        """List unbooked slots for a date, in chronological order."""
        all_slots = [Slot(date, h, m) for h in range(9, 17) for m in (0, 30)]
        return [s for s in sorted(all_slots, key=lambda s: (s.hour, s.minute))
                if self.is_free(s)]
