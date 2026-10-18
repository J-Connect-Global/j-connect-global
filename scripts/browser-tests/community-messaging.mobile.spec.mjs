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

test('private conversation keeps long text, timestamps and send feedback usable on mobile and tablet',async({page},testInfo)=>{
  let messages=Array.from({length:6},(_,i)=>({id:'message-'+i,nickname:'とても長いニックネームの参加者',body:'長い本文でも横にはみ出さず会話を読めます。'.repeat(4),mine:i%2===0,created_at:'2026-10-18T15:18:00Z'}));
  await page.route('https://script.google.com/**',async route=>{
    const values=new URLSearchParams(route.request().postData()||'');const action=values.get('action');
    let data={ok:true,messaging_version:'2026-10-18.1',public_replies:true,private_conversations:true};
    if(action==='communityUseAccess')data={ok:true,scope:'conversation',id:'conversation-mobile-ui',session:'b'.repeat(64)};
    if(action==='communityGetConversation')data={ok:true,post_title:'スマートフォンの非公開会話',status:'active',other_nickname:'運営テスト参加者',messages,has_more:false};
    if(action==='communitySendMessage')messages.push({id:'new-message',nickname:'自分',body:values.get('body'),mine:true,created_at:'2026-10-18T15:20:00Z'});
    await route.fulfill({json:data});
  });
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-mobile-ui#access='+'a'.repeat(64));
  await page.getByRole('button',{name:'確認して開く',exact:true}).click();
  await expect(page.locator('#privateMessages .cm-message')).toHaveCount(6);
  await expect(page.locator('#privateMessages time').first()).toContainText('17:18（ベルリン時間）');
  await assertNoHorizontalOverflow(page);
  await page.getByLabel('メッセージ（相手だけに表示）',{exact:true}).fill('スマホからの返信確認です。');
  await page.getByRole('button',{name:'返信する',exact:true}).click();
  await expect(page.locator('#messageStatus')).toContainText('返信を送信し');
  await expect(page.locator('#privateMessages')).toContainText('スマホからの返信確認');
  await expect(page.locator('#messageStatus')).toBeInViewport();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('conversation-mobile.png'),fullPage:true});
});
