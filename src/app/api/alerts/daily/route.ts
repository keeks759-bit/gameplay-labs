/**
 * API Route: GET /api/alerts/daily
 * 
 * WHY: Daily digest alert for storage/activity monitoring
 *      Sends email with metrics: videos, votes, daily counts, top uploaders/voters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    // Vercel automatically adds x-vercel-cron header for cron jobs
    // For manual testing, use x-cron-secret header
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    // Allow if: (1) Vercel cron header present, OR (2) custom secret matches
    const isVercelCron = vercelCronHeader === '1';
    const isManualRequest = cronSecret && expectedSecret && cronSecret === expectedSecret;

    if (!isVercelCron && !isManualRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Get Supabase client
    const supabase = await createServerSupabaseClient();

    // Get start of current UTC day
    const now = new Date();
    const utcStartOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const utcStartOfDayISO = utcStartOfDay.toISOString();

    // Query metrics
    const [
      totalVideosResult,
      totalVotesResult,
      videosTodayResult,
      votesTodayResult,
      topUploadersResult,
      topVotersResult,
    ] = await Promise.all([
      // Total videos count
      supabase.from('videos').select('id', { count: 'exact', head: true }),
      
      // Total votes count
      supabase.from('votes').select('id', { count: 'exact', head: true }),
      
      // Videos created today (UTC)
      supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', utcStartOfDayISO),
      
      // Votes created today (UTC)
      supabase
        .from('votes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', utcStartOfDayISO),
      
      // Top 5 uploaders today
      supabase
        .from('videos')
        .select('created_by')
        .gte('created_at', utcStartOfDayISO)
        .limit(1000), // Get enough to aggregate
      
      // Top 5 voters today
      supabase
        .from('votes')
        .select('user_id')
        .gte('created_at', utcStartOfDayISO)
        .limit(1000), // Get enough to aggregate
    ]);

    const totalVideos = totalVideosResult.count ?? 0;
    const totalVotes = totalVotesResult.count ?? 0;
    const videosToday = videosTodayResult.count ?? 0;
    const votesToday = votesTodayResult.count ?? 0;

    // Aggregate top uploaders
    const uploaderCounts = new Map<string, number>();
    if (topUploadersResult.data) {
      topUploadersResult.data.forEach((video: any) => {
        if (video.created_by) {
          uploaderCounts.set(video.created_by, (uploaderCounts.get(video.created_by) || 0) + 1);
        }
      });
    }
    const topUploaders = Array.from(uploaderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ user_id: userId, count }));

    // Aggregate top voters
    const voterCounts = new Map<string, number>();
    if (topVotersResult.data) {
      topVotersResult.data.forEach((vote: any) => {
        if (vote.user_id) {
          voterCounts.set(vote.user_id, (voterCounts.get(vote.user_id) || 0) + 1);
        }
      });
    }
    const topVoters = Array.from(voterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ user_id: userId, count }));

    // Format date for subject
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Build email body
    const emailBody = `Gameplay Labs Daily Digest — ${dateStr} (UTC)

=== OVERVIEW ===
Total Videos: ${totalVideos.toLocaleString()}
Total Votes: ${totalVotes.toLocaleString()}

=== TODAY (UTC) ===
Videos Created: ${videosToday.toLocaleString()}
Votes Cast: ${votesToday.toLocaleString()}

=== TOP UPLOADERS TODAY ===
${topUploaders.length > 0
  ? topUploaders.map((u, i) => `${i + 1}. User ${u.user_id.substring(0, 8)}... — ${u.count} video(s)`).join('\n')
  : 'No uploads today'}

=== TOP VOTERS TODAY ===
${topVoters.length > 0
  ? topVoters.map((v, i) => `${i + 1}. User ${v.user_id.substring(0, 8)}... — ${v.count} vote(s)`).join('\n')
  : 'No votes today'}

=== TIMESTAMP ===
Generated: ${now.toISOString()}
UTC Day Start: ${utcStartOfDayISO}
`;

    // Send email
    const emailTo = process.env.ALERTS_EMAIL_TO;
    const emailFrom = process.env.ALERTS_EMAIL_FROM;

    if (!emailTo || !emailFrom) {
      console.error('[ALERTS_DAILY] Missing email configuration:', {
        hasEmailTo: !!emailTo,
        hasEmailFrom: !!emailFrom,
      });
      return NextResponse.json(
        { error: 'Email configuration missing' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    await sendEmail({
      to: emailTo,
      from: emailFrom,
      subject: `Gameplay Labs Daily Digest — ${dateStr} (UTC)`,
      text: emailBody,
    });

    console.log('[ALERTS_DAILY] Digest sent successfully:', {
      date: dateStr,
      totalVideos,
      totalVotes,
      videosToday,
      votesToday,
    });

    return NextResponse.json(
      {
        ok: true,
        metrics: {
          totalVideos,
          totalVotes,
          videosToday,
          votesToday,
          topUploaders: topUploaders.length,
          topVoters: topVoters.length,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[ALERTS_DAILY] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
