# PriceNaija MVP — Outcome ToDo

The following outcome criteria are carried from the approved specification. Demo/sample prices must be labeled and must not be represented as real-world verified data. User-submitted prices are not facts until reviewed and verified.

## [x] 1. Brand, responsive shell, homepage and site-wide experience

- Build a complete, modern, responsive Nigerian price-comparison and market-intelligence web application called PriceNaija; build a real functional MVP, not merely a static design or landing page.
- Brand name **PriceNaija** and tagline **“Know the price. Save your money.”**; homepage headline **“Know the price. Save your money.”** and copy “PriceNaija helps Nigerians compare prices, discover trusted businesses and understand market prices before they buy.” Supporting copy “Compare prices across Nigeria before you buy.”
- Premium Nigerian technology startup aesthetic combining modern fintech, price-comparison, marketplace and data analytics; not a generic Nigerian government website. Brand colors: primary green #087443, dark black #111111, background #F8FAF7, accent gold #F5B942, white #FFFFFF. Use green for important actions and branding; gold sparingly for savings/deals/highlights; black for text/navigation; plenty of whitespace; rounded cards with subtle shadows; modern clean Inter or Manrope typography; bold headings/readable body/large naira figures. Rounded buttons, subtle borders/shadows, small icons, green verification checkmarks, gold savings/deals, red only for warnings/errors, clean chart labels; avoid excessive gradients and animations; feel like a serious, investment-ready startup.
- Mobile-first, tablet and desktop responsive. Desktop navigation: logo, Home, Compare Prices, Markets, Deals, Businesses, Community; right-side Log in and Sign up; primary CTA Report a Price. Mobile bottom navigation: Home | Search | Markets | Report | Profile.
- Homepage has a large search bar with placeholder “Search rice, cooking gas, iPhone, cement…” and popular searches Rice, Cooking Gas, Cement, Phones, Eggs, Food. Primary CTA **Compare Prices** and secondary CTA **Report a Price**. Include Trending Prices: 25kg Rice lowest ₦48,500, average ₦54,200, trend +4.8%; Cooking Gas 5kg lowest ₦7,800, average ₦8,400; Cement lowest ₦10,500, average ₦11,200; each has Compare. Include Prices Dropping: iPhone 13 ₦650,000 → ₦610,000, ↓ 6.2%, View Deal. Include Explore Prices Near You with Nigeria map, Lagos, Abuja, Ibadan, Port Harcourt, Benin, Kano, Enugu, Kaduna selectors and average prices. Include How PriceNaija Works: Search, Compare, Save.
- Use Nigerian naira symbol ₦ throughout and correct formats such as ₦50,000 and ₦1,250,000; never use dollar signs. Provide attractive empty states including “No price reports yet.”, “Be the first person to report a price.” and Report a Price CTA. Friendly error states include “We couldn't find that product.” and “Try searching for rice, cement or cooking gas.”
- Footer sections: PriceNaija and tagline; Platform: Compare Prices, Markets, Deals, Businesses, Community; Business: List Your Business, Business Dashboard, Market Intelligence; Support: Help Centre, Contact, Report an Issue; Legal: Privacy Policy, Terms, Trust & Safety; Copyright © 2026 PriceNaija.

## [x] 2. Functional search, product comparison, charts, markets and fair-price checker

- Implement real, dynamically updating search over product name, brand, business, category and location. Search page filters: Category, Location, Price range, Seller rating, Verified sellers, Date updated. Sorting: Lowest price, Highest price, Most recent, Best rated.
- Product detail example 25kg Rice, category Food & Groceries, current Nigerian price range ₦48,500–₦58,000, average ₦54,200, fair-price status. Seller comparison cards show seller name, location, price, last-updated date, rating, verified badge and View Seller action.
- Product page includes an interactive price-history line chart with 30 days, 90 days, 6 months and 1 year ranges; location comparison example Lagos ₦52,000, Ibadan ₦48,500, Abuja ₦55,000, Benin ₦50,000 and Port Harcourt ₦54,000. Assess Good Price, Normal Price or Above Recent Prices using the platform's recent verified data.
- Price Alert on a product allows a target such as “Notify me when price falls below ₦50,000.”
- Interactive Nigeria Market Price Map titled **Nigeria Market Price Map** lets users select a product (example 25kg Rice), displays average prices by state/city using different shades/intensity, and clicking a location shows average price, lowest price, highest price, report count and last updated.
- Fair Price Checker (also “How Much Should I Pay?”) accepts product, quantity and location, and calculates recent price range from verified data. Example 5kg Cooking Gas expected ₦7,500–₦8,500; ₦7,800 = Good price, ₦8,500 = Normal price, ₦10,000 = Above recent reported prices. Show exactly: “Prices are estimates based on recent PriceNaija reports and may vary by seller and location.”
- Charts are clear and easy to understand for price history, price changes, location comparison, category trends and business performance.

## [x] 3. Price reports, evidence uploads, verification and trust/safety

- Dedicated **Report a Price** form has Product name, Category, Brand, Quantity, Price, Location, Market, Seller/business name, Date, optional seller contact, photo upload and Description, with Submit Price. Example Rice, 25kg, ₦50,000, Mile 12 Market. Users can upload a photo of product/displayed price.
- After submission, show **“Submission received ✓”**, “Thank you for helping Nigerians discover better prices.” and status **Pending verification**.
- Price reports have statuses Pending, Under Review, Verified and Rejected. Display verified prices with **✓ Verified**. Do not automatically treat every submission as factual; administrators review price submissions.
- Secure uploads: validate authorization, file type/size and ownership; persist evidence metadata; prevent duplicate submissions and rate-limit report submissions.
- Trust & Safety allows users to report suspicious businesses or transactions with Reason, Description, Evidence, Screenshot/photo and Date. Show neutral **Community Reports**, e.g. “3 reports submitted about this business.” Do NOT automatically label anyone a scammer. Admins review reports and businesses have an appeal process.

## [x] 4. Business directory, profiles, seller actions, business dashboard and deals

- Business directory supports business search and filters for Location, Category, Verified businesses, Rating and Price range. Cards display business logo, business name, verified badge, location, rating, products and Contact button.
- Business profile example ABC Electronics: ✓ Verified Business, ⭐ 4.8, 📍 Ikeja, Lagos, description “Trusted electronics retailer…”, products iPhone 13 — ₦650,000; Samsung S23 — ₦720,000; AirPods — ₦180,000; buttons Contact Seller, View Products, Report Business.
- Separate business dashboard shows Total views, Customer leads, Products listed, Price updates, Average product price, Competitor price comparison and Market trends. Market Intelligence example: 25kg Rice, Average Lagos Price ₦53,200, Your Price ₦51,500, Market Position Below average.
- Deals page displays products with unusually good prices; cards show Product, Current price, Previous average, Percentage difference, Seller, Location, Verified status and View Deal. Sponsored listings are clearly labeled **Sponsored**.

## [ ] 5. User authentication, personal dashboard, saved products, alerts and notifications

- Implement secure PriceNaija email/password authentication as selected by the user: Sign up, Login, Logout, Forgot password, Email verification and roles Consumer, Business and Admin. Protect authentication and authorization; use secure password handling, expiring single-use verification/reset tokens, safe sessions and rate limits. Email verification/reset messages use a provider adapter; real delivery must only be claimed when an email service is configured. Credentials must be obtained through protected setup, never placed in source/chat. Development can use development-only verification/reset links.
- Personal dashboard greeting **Welcome back 👋** and sections Saved Products, Price Alerts, Recent Searches, Reported Prices, Verified Contributions and Potential Savings. Contribution example 23 prices submitted, 18 verified. Saved products example iPhone 13, Rice, Cooking Gas.
- User profile fields: Name, Profile picture, Email, Phone, Location, Saved products, Contribution history, Notifications and Account settings.
- Users create alerts (example iPhone 13 current price ₦625,000, target ₦600,000, Create Alert); when target is reached, show a notification.
- Notifications for Price alert triggered, Price submission verified, Price submission rejected, Business verification, New price report and Important account activity.

## [ ] 6. Admin tools, verification, analytics and community moderation

- Professional role-protected admin dashboard sidebar: Dashboard, Users, Products, Price Reports, Businesses, Business Verification, Trust Reports, Categories, Price Alerts, Analytics, Settings.
- Admin analytics show Total users, Active users, Total price reports, Verified reports, Pending reports, Registered businesses, Verified businesses, Most searched products, Most reported products and Average price changes.
- Admin price-verification queue shows Product, Submitted price, Location, Seller, User, Photo evidence, Date and Status. Actions: Approve, Reject, Request More Information. Administrators verify price submissions and businesses, manage users/products/categories, moderate reports and view platform analytics.
- Community supports discussions of Prices, Markets, Products, Shopping experiences and Tips. Users can Post, Comment, Like and Report; provide moderation tools.

## [x] 7. Relational data, sample data and truthful price aggregation

- Relational database tables include Users, Products, Categories, Businesses, BusinessProducts, PriceReports, PriceHistory, Locations, PriceAlerts, SavedProducts, TrustReports, Notifications, AdminUsers and Reviews, with appropriate relationships and indexes. Add supporting tables as required for secure email verification/reset, sessions, appeals, uploads and community moderation.
- Seed realistic Nigerian sample products: Rice, Cooking Gas, Cement, Eggs, Garri, Beans, Palm Oil, Bread, iPhone 13, Samsung Galaxy S23, Laptops, Generators, Televisions, Air Conditioners. Populate development data so views are not empty. Clearly label sample/demo data; do not present fictional data as real-world verified prices. Price assessments, public verified comparisons and fair-price calculations use verified data, not unverified reports or demo values presented as facts.

## [x] 8. Security, SEO, performance and complete MVP delivery

- Security: input validation, authentication protection, role-based access control, rate limiting for reports, secure file uploads, duplicate-submission protection, basic spam protection and privacy (do not expose private user information).
- SEO: appropriate page titles, meta descriptions, Open Graph tags, structured data where appropriate and SEO-friendly URLs. Examples: `/products/rice-25kg`, `/products/iphone-13`, `/businesses/abc-electronics`, `/markets/lagos`.
- Performance: load quickly, optimize images, lazy-load images where appropriate, mobile-friendly, avoid unnecessary animations.
- Complete MVP includes responsive frontend, backend, database, authentication, user dashboard, business dashboard, admin dashboard, product search, price comparison, price submissions, image uploads, price verification, price history, market map, business directory, price alerts, saved products, notifications, trust reporting, analytics, proper navigation and mobile responsive design.
- If a backend integration cannot be completed automatically, structure the frontend so backend/database can be connected without rebuilding the UI. Prioritize a polished, functional MVP over unnecessary features; the final product should look like a legitimate Nigerian technology startup ready for user testing.
