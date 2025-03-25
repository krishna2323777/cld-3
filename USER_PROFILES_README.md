# User Profile System

This document describes how to set up and use the user profile management system in the application.

## Overview

The user profile system allows storing and retrieving user information such as:
- Name
- Company Name
- Address
- Email
- Phone Number

## Setup Instructions

### 1. Create the Database Table

1. Go to the Supabase dashboard for your project
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase_migration.sql` and run the query
4. This will create the `user_profiles` table with proper security policies

### 2. Components Created

The following components have been created to manage user profiles:

- `userDataService.js`: Contains all the functions for interacting with the user profiles in the database
- `UserProfileForm.js`: A form component for users to create/edit their profile
- `UserProfileView.js`: A component to display user profile information

### 3. Integration into Routes

The components have been integrated into your routes in App.js:

```jsx
<Routes>
  {/* Other routes */}
  <Route path="/profile" element={<UserProfileView />} />
  <Route path="/profile/edit" element={<UserProfileForm />} />
</Routes>
```

## Usage

### For Users

1. After logging in, direct users to complete their profile using the `/profile/edit` route
2. Users can view their profile information at the `/profile` route
3. Users can only see and edit their own profile information

## API Functions

The following functions are available in `userDataService.js`:

- `createOrUpdateUserProfile(userData)`: Creates or updates a user profile
- `getUserProfile(userId)`: Gets a single user profile by user ID

## Security

- Row Level Security (RLS) is implemented at the database level
- Users can only access their own profiles
- Check `supabase_migration.sql` for the detailed security policies

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Verify that Supabase credentials are correctly set up in your `.env` file
3. Ensure the database migration has been applied correctly 