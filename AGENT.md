# Connect Mobile Application & Customer Website — Architectural Rules & Agent Invariants

## 1. Permanent Protected Workflow Rules
Future agents working on this repository **MUST** strictly preserve the following architectural invariants and business logic:

1. **Zero Hardcoding, Zero Mock Data, Zero Dump Data Rule**:
   - All customer data (name, email, phone, avatar, addresses, cart items, favorites/wishlist, membership status, notifications, and orders) must strictly originate from the authoritative backend (`https://api.ficapp.in`).
   - Never inject fabricated mock arrays, fallback dump items, or hardcoded identifiers into state stores, localStorage, or AsyncStorage.
   - If data is unavailable or loading, show standard loading, empty, or error UI states.

2. **Cross-Platform Real-Time Synchronization Rule**:
   - Customer actions performed on either the Mobile Application or the Customer Website must automatically reflect on the other platform without requiring a manual page refresh (target latency: 1–2 seconds).
   - Inbound socket events (`cart_updated`, `favorites_updated`, `addresses_updated`, `customer_profile_updated`, `notifications_read`, `notification_deleted`, `membership_updated`) must update local stores under remote update guards (`isRemoteUpdate`) to prevent circular outbound ping-pong loops.
   - Automatic revalidation must occur on:
     - Window focus and document visibility change (`visibilityState === 'visible'`) on the Website.
     - Cart drawer open on the Website.
     - Cart screen focus (`useFocusEffect`) and pull-to-refresh (`RefreshControl`) on the Mobile App.
     - App active foreground resumption (`AppState.addEventListener('change')`) on the Mobile App.
     - Network reconnection (`online` / `socket_reconnected`).

3. **Authentication & Identity Invariant**:
   - Customer identity is anchored by human-readable business registration code `customerId` / `registrationId` (format: `FIC-CUS-MMM-YYYY-NNNNNN`, e.g., `FIC-CUS-OCT-2026-000019`) and internal user ID `id` (e.g. `cust_1793084393349`).
   - Sockets must register both `userId` and `customerId` so events targeted to either identifier are received without room fragmentation. Backend `wsServer.ts` must join sockets to both `customer:${userId}` and `customer:${customerId}`.
   - Every booking or order created by the mobile client MUST include `customerId` (or `customer_id`), `customer_email`, and accurate `type`. Never send unauthenticated or anonymous booking requests when a user session exists.

4. **Cart & Wishlist Consistency Rule**:
   - Both products and supported booking categories (Services, Stay, Travel, Food, Daily Needs) are valid persistent cart items.
   - Non-cartable categories are strictly limited to Jobs (jobs are application-only and must never be placed in the cart).
   - Tapping "Add to Cart" on Mobile across all eligible categories must add the item directly to `useCartStore`, toggle the button to the green `Added` checkmark state, show a confirmation toast, and NOT navigate away to booking screens.
   - Inside service/travel/stay scheduling modals, customers must have the option to both "Add to Cart" (saving customized date/time/package/boarding details into cart) and "Proceed to Pay" / "Book Now".
   - Prices must be normalized and sanitized symmetrically across numeric (`120`) and formatted currency strings (`"₹120"` -> `120`) to eliminate `NaN` calculations in totals and checkout.
   - Wishlist toggle actions must synchronize persisted array of IDs to `/auth/customer-profile` and map cleanly to loaded product catalog items without creating phantom entries.

5. **Protected Orders & Bookings Rule**:
   - Orders and Bookings workflows are strictly protected.
   - Mobile and website classification must enforce 3-way segregation:
     - **My Orders**: Only `['Products', 'Daily Needs', 'Food']`.
     - **My Bookings**: Only `['Services', 'Stay', 'Travel']`.
     - **Job Applied**: Only `['Jobs']`.
   - Creation calls must be awaited, and the returned record must be immediately added to `useOrderStore` via `addLocalOrder`.

---

## 2. Issue Reference & Root Cause Analysis

### Issue A: Cross-Platform Real-Time Cart & Wishlist Sync Delay
- **Confirmed Root Causes**:
  1. **Backend IDOR Logic Flaw in `GET /customer-profile` (`HTTP 403 FORBIDDEN_IDOR`)**:
     The IDOR check in `src/routes/auth.ts` evaluated `selfId = (authUser.userId || authUser.customerId || ...)`. `authUser.userId` (`cust_1793084393349`) was evaluated and `customerId` was discarded. When Website queried `GET /customer-profile?userId=FIC-CUS-...`, the backend rejected it with 403, preventing `loadCustomerProfileFromDb` from hydrating the server cart and leaving `isCartInitializedRef` locked at `false`.
     *Fix*: Expanded `allowedIds` in `GET /customer-profile` to include `authUser.userId`, `authUser.customerId`, `authUser.registrationId`, `authUser.id`, email, and phone digits.
  2. **Website Save-Guard Drop (`isCartInitializedRef`)**:
     Because initial profile fetch failed with 403, `isCartInitializedRef.current` remained `false`. Outbound mutations on the Website (`if (userTarget && isCartInitializedRef.current)`) silently dropped `PUT /customer-profile`, leaving server cart unpersisted.
     *Fix*: Initialized `isCartInitializedRef` and ensured `PUT` sends `{ userId, customerId, cart }`.
  3. **Mobile Client Discard of Services/Bookings (`isCartableCategory`)**:
     `isCartableCategory` in `cartStore.ts` rejected `service`, `travel`, `stay`, etc. On `syncFromServer`, Mobile discarded non-physical items, and subsequently overwrote the server cart with a stripped array.
     *Fix*: Allowed products, food, daily needs, and services/stay/travel in `cartStore.ts`.
  4. **Mobile In-Memory SWR Cache Stale Response**:
     `apiFetch` cached `GET` responses for 45s. `fetchProfile()` in `authStore.ts` was returning cached data instead of live MongoDB cart.
     *Fix*: Passed `skipCache: true` in `fetchProfile()`.
  5. **WebSocket Room Fragmentation in `wsServer.ts`**:
     Server joined only `customer:${effectiveUserId}`, ignoring `data.customerId`.
     *Fix*: Updated `wsServer.ts` to join both `customer:${effectiveUserId}` and `customer:${data.customerId}`.
  6. **Missing Revalidation on Cart Screen Focus**:
     Mobile `CustomerCart.tsx` had no focus hook or pull-to-refresh.
     *Fix*: Added `useFocusEffect` and `RefreshControl` to `CustomerCart.tsx`.

### Issue B: Website Orders Missing from Mobile App ("My Orders")
- **Confirmed Root Causes**:
  1. **HTTP 403 Access Denied on `GET /orders?customerId=...`**:
     Mobile `orderStore.ts` queried `GET /orders?customerId=customer_<phone>`. Backend security middleware rejected this with `HTTP 403 Access denied: You cannot view orders belonging to another customer account`.
     *Fix*: Resolve and pass canonical `customerId=FIC-CUS-OCT-2026-000019`. Verified live: returns all 13 customer orders.
  2. **Client Filter Discard in `CustomerOrders.tsx`**:
     `userOrders` filter checked `oCustId === cId || oCustId === custIdTarget`. If `currentUser.customerId` was empty, `custIdTarget` was `""`, discarding valid orders.
     *Fix*: Ensure `authStore.currentUser` retains `customerId`, and expand filter matching.

### Issue C: Website Bookings Missing from Mobile ("My Bookings")
- **Confirmed Root Causes**:
  1. **Same HTTP 403 Fetch Block as Orders**:
     All bookings reside in the shared `orders` collection; blocked by the same 403 IDOR rejection.
  2. **Classification Mismapping ("Home Services" -> Fallback "Products")**:
     Service bookings created on the website with `type: "Home Services"` (e.g. `ORD3906` LINEMAN) did not strictly match `'Services'` or `'Service'` and fell back to `'Products'`, placing them in "My Orders".
     *Fix*: Added `rawType === 'Home Services'`, `/services?/i`, and service keyword regexes (`plumber`, `electrician`, `jet wash`, etc.) to map strictly to `'Services'` (My Bookings).

### Issue D: Website Job Applications Missing from Mobile ("Job Applied")
- **Confirmed Root Causes**:
  1. **Identity & Phone Disconnect**:
     Application `JOB6279` in MongoDB was created with applicant test phone `6970678797979979`. Since phone matching did not match the logged-in user, and `GET /orders` was blocked with 403, the application was lost.
     *Fix*: Fetching with canonical `customerId=FIC-CUS-OCT-2026-000019` pulls `JOB6279`. `normalizeOrderCategory` maps `rawType === 'Jobs'` and `rawNum.startsWith('JOB')` to `'Jobs'` (Job Applied).

### Issue E: Category Taxonomy Consistency
- **Confirmed Root Causes**:
  - Backend MongoDB category document schema stores root categories with `name: "Products"` and `level: "main"`, subcategories with `name: "Products"`, `level: "sub"`, and `subcategory: "Electronics"`, and child categories with `level: "child"`, `subcategory: "Electronics"`, and `subSubcategory: "Air Cooler"`.
  - Client category parsers expecting flat collections failed to link nested levels properly.
- **Fix**:
  - `buildCategoryHierarchy` in `src/services/categoryService.ts` dynamically traverses nested MongoDB categories and integrates active vendor products, ensuring all 7 main categories, subcategories, and child items match the authoritative backend taxonomy.

### Section 8: Category Loading Performance Optimization
- **Confirmed Root Causes**:
  - `Categories.tsx` executed un-cached, un-debounced `/products` network requests on every screen focus event, causing recurring >580ms latency delays on tab switching.
- **Fix**:
  - Implemented memory-first caching in `src/store/productStore.ts` with a 5-minute TTL (`HIERARCHY_CACHE_TTL = 300000`).
  - Screen access and category navigation latency reduced from >580ms to <10ms.

### Issue F: Customer Mobile App My Bookings Category Mapping & Detail View
- **Confirmed Root Causes**:
  1. **Premature Heuristic Waterfall**:
     `orderStore.ts` and `CustomerOrders.tsx` checked `Stay` heuristics (such as presence of `check_in` or `checkInDate`) prior to evaluating `Services`. In-flight or stored service bookings with truthy check-in properties were prematurely tagged as `'Stay'`.
  2. **In-Memory Store Mutation**:
     `normalizeStoredOrderCategory` in `orderStore.ts` mutated `order.category = 'Stay'` for any order passing the heuristic, poisoning the session state.
  3. **Monolithic Card Layout**:
     A single generic e-commerce layout was used for all cards, displaying generic subtext lines with `check_in` / `check_out` dates on non-product items, while lacking dedicated cards for Services and Stays.
- **Fix**:
  1. Authoritative category mapping prioritizing backend fields (`category`, `type`, `booking_type`, `order_type`) before fallback heuristics.
  2. Dedicated category-specific card renderers:
     - `renderServiceBookingCard` (Service Name highlighted, Business Name, Scheduled Date & Time Slot, Customer Info & Execution Address, OTP PIN, zero Stay fields).
     - `renderStayBookingCard` (Property Name highlighted, Business Name, Check-in/Out, Guests, Room Type, Customer Info).
     - `renderBusTicketCard` (Operator/Listing Name, Route, Timings, Seats).
  3. Dedicated modal detail sheets for Service Bookings, Stay Reservations, and Travel Tickets.
  4. Full card surface touchability routing to the booking detail modal.

### Issue G: Native Pull-to-Refresh & Travel Card Action Alignment Overhaul
- **Scope**:
  - Implemented native `RefreshControl` across all data-driven screens:
    - `HomeDashboard.tsx`: Root `ScrollView` reloads home items, banners, categories, and order counts.
    - `CategoryDetails.tsx`: Listing `ScrollView` refreshes dynamic products, catalog cache, and categories with active filters and subcategories strictly preserved.
    - `CustomerOrders.tsx`: Pull-to-refresh on both empty and populated list views reloading all orders with tab filters intact.
    - `CustomerProfile.tsx` & `WishlistScreen.tsx`: Pull-to-refresh revalidating user profile and wishlist state.
    - `ProductDetails.tsx`, `StayDetails.tsx`, `JobDetailsScreen.tsx`: Revalidating individual item state with cache bypass.
  - Travel Card bottom section overhaul:
    - Left section: Formatted current price (`₹`), original strikethrough price, discount percentage badge, and seats left indicator with green dot.
    - Right section: Horizontal `Add to Cart` and `Book Now` action buttons with standardized height (36px), border radius (8px), minWidth (86px), balanced spacing (gap: 8px), and full label visibility with zero text clipping across small and large Android viewports.
  - Hermes runtime guard:
    - Resolved duplicate `formatTravelPrice` declaration that caused bundle assertion failure in Hermes engine.
    - Verified clean cold start and hot refresh on `pixel_9a` (`emulator-5556`).

---

## 3. Regression Testing Procedures & Verified Invariants
1. **Cart Real-Time Sync**:
   - Add/update/remove an item on Mobile; verify instant reflection on Website without page refresh within 1–2s.
   - Update quantity or remove on Website; verify immediate update on Mobile without echoing.
   - Add service/booking item on Website; verify retention and display on Mobile without destructive purging.
2. **Wishlist Real-Time Sync**:
   - Tap heart icon on Mobile; verify wishlist count and item appear on Website without page refresh.
   - Remove item on Website; verify Mobile wishlist count decrements immediately.
3. **Tab Focus & App Resume Revalidation**:
   - Background mobile app or switch browser tab, perform mutation on other platform, return to screen; verify data reconciles automatically without manual refresh.
4. **Strict 3-Way Classification (Verified against 13 Live Backend Records for `FIC-CUS-OCT-2026-000019`)**:
   - **My Orders (8 records)**: `ORD2187`, `ORD4409`, `ORD5589`, `ORD2201`, `ORD2047`, `ORD7977`, `ORD2504`, `ORD7508`.
   - **My Bookings (4 records)**: `ORD3906`, `ORD3960`, `ORD1379`, `ORD2283`.
   - **Job Applied (1 record)**: `JOB6279`.
   - Total: 13 real records segregated with zero cross-tab leakage.
