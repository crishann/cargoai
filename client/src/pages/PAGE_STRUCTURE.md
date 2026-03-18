# CarGoAI Page Structure

This page structure keeps the frontend easier to scale and avoids duplicating page files.

## Recommended Structure

```text
src/
└── pages/
    ├── public/
    │   └── LandingPage.jsx
    ├── auth/
    │   ├── LoginSignUp.jsx
    │   └── ForgotResetPassword.jsx
    │
    ├── shared/
    │   ├── Chatbot.jsx
    │   ├── ProfileSettings.jsx
    │   ├── EditProfile.jsx
    │   ├── ChangePassword.jsx
    │   ├── SecuritySettings.jsx
    │   └── Notifications.jsx
    │
    ├── renter/
    │   ├── VehicleSelection.jsx
    │   ├── DateSelection.jsx
    │   ├── BookingForm.jsx
    │   ├── BookingFormContinue.jsx
    │   ├── PaymentMethod.jsx
    │   ├── BookingConfirmation.jsx
    │   └── BookingHistory.jsx
    │
    ├── owner/
    │   ├── OwnerDashboard.jsx
    │   ├── VehicleManagement.jsx
    │   ├── VehicleList.jsx
    │   ├── BookingCalendar.jsx
    │   ├── PaymentRecords.jsx
    │   ├── ContractReleasing.jsx
    │   ├── SubscriptionManagement.jsx
    │   ├── BookingTransactionHistory.jsx
    │   └── AccountStatus.jsx
    │
    └── admin/
        ├── AdminDashboard.jsx
        ├── SubscriptionApproval.jsx
        ├── PaymentMonitoring.jsx
        ├── AccountManagement.jsx
        ├── ComplaintManagement.jsx
        ├── RolePermissionManagement.jsx
        ├── AuditLogs.jsx
        └── RestrictedAccounts.jsx
```

## Current Mapping

Current active page files:
- `public/LandingPage.jsx`
- `renter/RenterDashboard.jsx`
- `owner/OwnerDashboard.jsx`
- `admin/AdminDashboard.jsx`

## Notes

- The app uses the landing page modal flow for `/login` and `/register`.
- Empty folders are scaffolded now so future pages can be added in the right place.
- Legacy flat page files were removed after migration to the folder structure.
