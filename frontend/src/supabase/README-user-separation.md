# User Separation: Consumer vs Admin Users

## Problem
Previously, when creating admin users, they were also being created in the `user_profiles` table, making it difficult to track and distinguish between consumer users and admin users.

## Solution
This implementation ensures that:
1. **Consumer users** can only exist in `user_profiles`
2. **Admin users** can only exist in `admin_profiles`
3. A user **cannot** be in both tables simultaneously
4. Database-level constraints prevent cross-contamination

## Implementation Steps

### Step 1: Run the Database Migration
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migration-separate-users.sql`
4. Review the migration carefully (especially the cleanup section)
5. Execute the SQL

This migration will:
- Create helper functions to check user types
- Add database triggers to prevent users from being in both tables
- Enforce separation at the database level

### Step 2: Clean Up Existing Data (Optional but Recommended)
If you have existing users that are in both tables, you'll need to decide:
- **Option A**: Keep them as admins (delete from `user_profiles`)
- **Option B**: Keep them as consumers (delete from `admin_profiles`)

You can uncomment and modify the cleanup query in the migration file:
```sql
DELETE FROM public.user_profiles
WHERE id IN (
  SELECT id FROM public.admin_profiles
);
```

**⚠️ WARNING**: Review this carefully before running in production!

### Step 3: Verify the Implementation
The backend controllers have been updated to:
- Check if a user is already an admin before creating a consumer profile
- Check if a user is already a consumer before creating an admin profile
- Return clear error messages when conflicts are detected

## How It Works

### Database Level Protection
1. **Trigger on `user_profiles`**: Prevents insertion/update if the user is an admin
2. **Trigger on `admin_profiles`**: Prevents insertion/update if the user is a consumer
3. **Helper Functions**: `is_admin_user()` checks if a user is an admin

### Application Level Protection
1. **`createUser()` function**: Checks if user exists in `admin_profiles` before creating consumer profile
2. **`createAdmin()` function**: Checks if user exists in `user_profiles` before creating admin profile

## API Behavior

### Creating Consumer Users (`POST /api/users`)
- ✅ Creates user in `auth.users` (if new)
- ✅ Creates profile in `user_profiles`
- ❌ Fails if user already exists in `admin_profiles`
- ❌ Fails if user already exists in `user_profiles`

### Creating Admin Users (`POST /api/admin/create-admin`)
- ✅ Creates user in `auth.users` (if new)
- ✅ Creates profile in `admin_profiles`
- ❌ Fails if user already exists in `user_profiles`
- ❌ Fails if user already exists in `admin_profiles`

## Error Messages

### When trying to create consumer for existing admin:
```
"This email is already registered as an admin user. Cannot create consumer profile for admin users."
```

### When trying to create admin for existing consumer:
```
"This email is already registered as a consumer user. Cannot create admin profile for consumer users."
```

## Testing

After implementation, test the following scenarios:

1. ✅ Create a new consumer user → Should succeed
2. ✅ Create a new admin user → Should succeed
3. ❌ Try to create consumer user with admin email → Should fail with clear error
4. ❌ Try to create admin user with consumer email → Should fail with clear error
5. ✅ Verify database triggers work by attempting direct SQL inserts

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS prevent_admin_in_user_profiles_trigger ON public.user_profiles;
DROP TRIGGER IF EXISTS prevent_consumer_in_admin_profiles_trigger ON public.admin_profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.prevent_admin_in_user_profiles();
DROP FUNCTION IF EXISTS public.prevent_consumer_in_admin_profiles();
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
```

## Notes

- The database triggers provide the strongest protection against data inconsistencies
- Application-level checks provide better error messages and user experience
- Both layers work together to ensure data integrity
- This solution maintains backward compatibility with existing code that queries these tables separately
