import { expect, test } from '@playwright/test';
import { activeCommunityPosts, assertNoHorizontalOverflow, stubDriveImages } from './support.mjs';
test.beforeEach(async ({page}) => { await page.addInitScript(() => localStorage.setItem('jconnect_cookie_consent','denied')); });

test('inline public/private composer, reply selection and access confirmation fit mobile and tablet',async({page})=>{
  await stubDriveImages(page);
  const post=activeCommunityPosts[0];
  await page.route('https://script.google.com/**',route=>{const action=new URLSearchParams(route.request().postData()||'').get('action');return route.fulfill({json:action==='communityMessagingStatus'?{ok:true,messaging_version:'2026-10-18.1',public_replies:true,private_conversations:true,inline_replies:true,instant_publish:true}:{ok:true,replies:[{id:'reply-mobile',post_id:post.id,number:3,nickname:'とても長いニックネームの回答者',body:'こちらのサービスを利用しました。',published_at:'2026-10-18T10:00:00Z'}]}});});
  await page.goto(post.detail_url);await expect(page.getByLabel('ニックネーム',{exact:true})).toBeEnabled();
  await page.locator('#reply-reply-mobile').getByRole('button',{name:'返信する',exact:true}).click();await expect(page.locator('.cm-target-context')).toContainText('#3');await assertNoHorizontalOverflow(page);
  await page.getByRole('radio',{name:'非公開返信',exact:true}).check();await expect(page.locator('.cm-mode-notice')).toContainText('非公開');await expect(page.getByRole('button',{name:'送信する',exact:true})).toBeVisible();await assertNoHorizontalOverflow(page);
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-mobile#access='+'a'.repeat(64));await expect(page.getByRole('button',{name:'確認して開く',exact:true})).toBeVisible();expect(page.url()).not.toContain('#');await assertNoHorizontalOverflow(page);
});
