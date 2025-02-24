create or replace function public.check_category_limit()
returns trigger
language plpgsql
as $$
declare
    user_subscription record;
    category_limit integer;
begin
    -- Get user's subscription
    select * into user_subscription 
    from subscriptions 
    where user_id = NEW.id 
    and (status = 'active' or status = 'trial')
    order by created_at desc 
    limit 1;

    -- Set category limit based on plan and status
    category_limit := case 
        when user_subscription.status = 'trial' then 10  -- Trial users get Professional plan limit
        when user_subscription.plan = 'Basic' then 3
        when user_subscription.plan = 'Professional' then 10
        when user_subscription.plan = 'Enterprise' then null -- No limit
        else 3 -- Default to Basic limit
    end;

    -- Check if number of categories exceeds limit
    if category_limit is not null and 
       array_length(NEW.preferred_categories, 1) > category_limit then
        raise exception 'Cannot select more than % categories with current subscription plan', category_limit;
    end if;

    return NEW;
end;
$$;
