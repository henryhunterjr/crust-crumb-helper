# QA Checklist — Crust & Crumb Community Manager

Follow these steps to verify the app is working correctly before launch.

## Authentication
- [ ] Open the app — you should see the Login page
- [ ] Click "Sign in with Google" — sign in with your admin account
- [ ] You should land on the Dashboard
- [ ] Verify the Header shows your avatar/email and a Sign Out button
- [ ] Click Sign Out — you should return to the Login page
- [ ] Try navigating directly to `/members` while signed out — should redirect to `/login`

## Member Segmentation
- [ ] Go to Members page
- [ ] Check that filter tab counts match the actual members shown when you click each tab
- [ ] Click "Never Engaged" — verify all shown members have zero posts AND zero comments
- [ ] Click "At Risk" — verify shown members were active before but haven't been active in 14+ days
- [ ] Click "Inactive 30+" — verify shown members haven't been active in 30+ days
- [ ] Click "Needs Welcome" — verify shown members joined 3+ days ago and haven't been contacted

## DM Generation
- [ ] Pick any member and click "Generate DM"
- [ ] Verify the message has NO asterisks, NO markdown formatting, NO em dashes
- [ ] Verify the tone sounds like Henry (warm, encouraging, uses contractions)
- [ ] Verify matched resources/recipes appear as badges below the message
- [ ] Click "Copy & Open Skool" — message should copy to clipboard and open Skool in a new tab
- [ ] Click "Mark as Sent" — member's status should update

## Smart Search
- [ ] Go to Smart Search
- [ ] Search for "sourdough starter" — verify results appear with matching words highlighted
- [ ] Verify no duplicate results in any section
- [ ] Check the AI-drafted response has no markdown artifacts
- [ ] Copy the response and verify it pastes cleanly

## Outreach Queue
- [ ] Go to Queue page
- [ ] Load a batch of members
- [ ] Click "Generate All" — messages should generate one by one
- [ ] Verify the "Copy & Open Skool" button works on generated messages
- [ ] Use keyboard shortcut Ctrl+C to copy, Ctrl+Enter to mark sent

## Calendar & Campaigns
- [ ] Go to Campaigns — create a new campaign
- [ ] Verify it persists after page refresh
- [ ] Go to Calendar — verify posts show on the correct dates
- [ ] Click on a day to see the detail panel

## Settings
- [ ] Go to Settings — verify all sections load (AI Personality, Outreach Rules, Interest Mappings, DM Templates, Classroom Resources, Recipe Pantry)
- [ ] Edit a DM template and save — verify changes persist

## General
- [ ] Check responsive layout on tablet (iPad) width
- [ ] Verify no console errors during normal usage
- [ ] Verify all icon buttons have visible tooltips on hover
