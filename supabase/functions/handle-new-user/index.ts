import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function handleNewUser(userId: string) {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days trial

  try {
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: 'Professional', // Give trial users access to Professional features
        status: 'trial',
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndDate.toISOString()
      });

    if (error) throw error;

    console.log(`Trial subscription created for user ${userId}`);
  } catch (error) {
    console.error('Error creating trial subscription:', error);
    throw error;
  }
}