import { expect, test } from '@playwright/test';
import { activeCommunityPosts, assertNoHorizontalOverflow } from './support.mjs';
test('messaging form and access confirmation fit mobile and tablet screens',async({page})=>{
  await page.route('https://script.google.com/**',route=>route.fulfill({json:{ok:true,messaging_version:'2026-10-17.1',public_replies:true,private_conversations:true}}));
  await page.goto('/germany/ja/community/contact/?post_id='+encodeURIComponent(activeCommunityPosts.find(p=>p.category1==='質問').id));
  await expect(page.locator('#contactTitle')).toHaveText('ニックネームで公開返信');
  await expect(page.locator('#contactForm fieldset')).toBeEnabled();await assertNoHorizontalOverflow(page);
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-mobile#access='+'a'.repeat(64));
  await expect(page.getByRole('button',{name:'確認して開く',exact:true})).toBeVisible();
  expect(page.url()).not.toContain('#');await assertNoHorizontalOverflow(page);
});
