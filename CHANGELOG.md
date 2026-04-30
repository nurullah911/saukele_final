# CHANGELOG

## Sprint 1

Implemented foundational backend according to Saukele blueprint.

One practical addition was made: `role` is accepted during registration for demo and oral defense convenience, but it is restricted to `COUPLE` or `GUEST`. `ADMIN` cannot be created through public registration. In production, admin creation should be done through seed script or internal admin tooling.
