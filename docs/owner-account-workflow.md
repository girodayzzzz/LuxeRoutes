# Owner account workflow

This checklist tracks the public owner journey and the private admin checks that keep the owner panel restricted to confirmed accounts.

## 1. Owner registration

1. Owners start on `register.html` and choose **Property Owner** as the requested role.
2. The browser validates the profile fields, password length, and business context before it asks for an email code.
3. The OTP endpoint sends the code, verifies it, and sets the signed `luxeroutes_account_session` cookie.
4. `/api/account` saves the profile with:
   - `requested_role = 'owner'`
   - `default_role = 'customer'`
   - `status = 'pending_admin_grant'`
   - a default active customer grant if no grant exists yet
5. The registration page shows a review-complete message and links pending owners to the normal account dashboard, not directly to the owner panel.

## 2. Login and dashboard routing

1. Owners login through `login.html` using either their password or an emailed OTP.
2. The login response uses the active access grant to calculate the current role.
3. Pending owners still have the customer role, so redirects send them to `account.html`.
4. Approved owners have an active owner grant, so redirects send them to `owner-panel.html`.
5. If a customer or pending owner manually opens `owner-panel.html`, the page checks `/api/account`, detects that the role is not owner/admin, and redirects back to that user's allowed dashboard.

## 3. Admin confirmation

1. Admins review pending profiles in the admin grants API.
2. Approving an owner updates both tables:
   - `access_grants.role = 'owner'`
   - `profiles.default_role = 'owner'`
   - `profiles.status = 'active'`
3. Rejecting an owner request leaves customer access active and marks the profile rejected.

## 4. Owner panel and offer submission

1. The owner panel requires an owner or admin role before private owner APIs return data.
2. Owners can submit stays, experiences, transfers, yachts, fishing escapes, wellness sessions, and route services.
3. New owner offers are inserted as unpublished listings with `partner_status = 'pending_review'` and `owner_email` set from the verified session email.
4. Configured admin reviewers are emailed when a new owner offer enters the review queue.
5. The owner can update availability, price labels, discounts, detailed notes, gallery URLs, and external availability links for their own offers only.
6. Admins can later approve/publish offers and assign managers; owners are emailed when their offer is approved, published, or returned with change requests.
7. Admins can also create an offer directly for a paid owner service from the admin console by assigning the owner email, adding availability/pricing/detail fields, and choosing whether to publish immediately or keep it assigned for owner review.

## 5. Requests and follow-up

1. Customer inquiries connected to an owner email appear in the owner requests panel.
2. Owners can update assigned request statuses through the owner inquiries API.
3. Managers use the matching manager workflow for assigned offers and forwarded requests.
