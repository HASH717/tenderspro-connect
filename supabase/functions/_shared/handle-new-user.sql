-- Update the handle_new_user function to also create a trial subscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert into profiles as before
  insert into public.profiles (id, first_name, last_name, phone_number)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone_number'
  );
  
  -- Create trial subscription
  insert into public.subscriptions (
    user_id,
    plan,
    status,
    current_period_start,
    current_period_end
  ) values (
    new.id,
    'Professional',
    'trial',
    now(),
    now() + interval '7 days'
  );
  
  return new;
end;
$$;
