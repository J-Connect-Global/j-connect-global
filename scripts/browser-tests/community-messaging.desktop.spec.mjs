import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { activeCommunityPosts, assertNoHorizontalOverflow, stubDriveImages } from './support.mjs';
test.beforeEach(async ({page}) => { await page.addInitScript(() => localStorage.setItem('jconnect_cookie_consent','denied')); });

const q = activeCommunityPosts.find(p => p.category1 === '質問');
const sale = activeCommunityPosts.find(p => p.category1 !== '質問');
const status = { ok:true, messaging_version:'2026-10-18.1', public_replies:true, private_conversations:true, inline_replies:true, instant_publish:true };
const example = (post, number = 3) => ({ id:'reply-browser-' + number,post_id:post.id,number,nickname:'はな',body:'こちらのサービスを使いました。',reply_to:'',published_at:'2026-10-18T10:00:00Z',deleted:false });
async function mock(page, handler = () => ({ok:true}), replies = []) {
  await stubDriveImages(page);
  await page.route('https://script.google.com/**', async route => {
    const values = new URLSearchParams(route.request().postData() || '');
    const action = values.get('action');
    const data = action === 'communityMessagingStatus' ? status : action === 'communityPublicReplies' ? {ok:true,replies} : await handler(values,route.request());
    await route.fulfill({json:data,headers:{'Access-Control-Allow-Origin':'*'}});
  });
}
const composer = page => page.locator('[data-cm-form]');
async function fillPublic(page) {
  await page.getByLabel('ニックネーム',{exact:true}).fill('ニック');
  await page.getByLabel('通知用メールアドレス（相手に非公開）',{exact:true}).fill('browser@example.com');
  await page.getByLabel('メッセージ',{exact:true}).fill('読者にも役立つ回答です。');
  await page.getByLabel('削除用パスワード（8文字以上）',{exact:true}).fill('correct-test-password');
  await composer(page).getByRole('checkbox').check();
}
test('every category has an inline composer with public selected and one send button',async({page})=>{
  await mock(page);
  for(const post of [q,sale]) {
    await page.goto(post.detail_url);
    await expect(page.getByRole('radio',{name:'公開返信',exact:true})).toBeChecked();
    await expect(page.getByLabel('ニックネーム',{exact:true})).toBeEnabled();
    await expect(page.getByRole('button',{name:'送信する',exact:true})).toHaveCount(1);
    await expect(page.getByRole('button',{name:'確認メールを送る',exact:true})).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
  }
});
test('reply buttons and manually entered numbers select the same target; mode switch keeps text and resets consent',async({page})=>{
  const replies=[example(q)];await mock(page,undefined,replies);await page.goto(q.detail_url);
  await page.locator('#reply-reply-browser-3').getByRole('button',{name:'返信する',exact:true}).click();
  await expect(composer(page).locator('textarea')).toBeFocused();
  await expect(composer(page).locator('.cm-target-context')).toContainText('#3・はなさん');
  await fillPublic(page);
  await page.getByRole('radio',{name:'非公開返信',exact:true}).check();
  await expect(composer(page).getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByLabel('メッセージ',{exact:true})).toHaveValue('読者にも役立つ回答です。');
  await expect(page.getByLabel('削除用パスワード（8文字以上）',{exact:true})).toBeHidden();
  await expect(composer(page).locator('.cm-target-context')).toContainText('送信先：#3・はなさん');
  await page.getByRole('button',{name:'元の投稿への返信に戻す'}).click();
  await expect(composer(page).locator('.cm-target-context')).toContainText('元の投稿者');
  await page.getByLabel('返信先',{exact:true}).fill('#3');
  await expect(composer(page).locator('.cm-target-context')).toContainText('#3・はなさん');
});
test('public send publishes immediately and never sends the raw deletion password',async({page})=>{
  const replies=[example(sale)];let submitted;
  await mock(page,values=>{ submitted=Object.fromEntries(values); const reply={...example(sale,4),nickname:values.get('nickname'),body:values.get('body'),reply_to:values.get('reply_to')};replies.push(reply);return {ok:true,id:reply.id,reply,notification_pending:true}; },replies);
  await page.goto(sale.detail_url);await expect(page.getByLabel('ニックネーム',{exact:true})).toBeEnabled();await fillPublic(page);
  await page.getByLabel('返信先',{exact:true}).fill('#3');await composer(page).getByRole('checkbox').check();
  await page.getByRole('button',{name:'送信する',exact:true}).click();
  await expect(composer(page).locator('[data-compose-status]')).toContainText('公開しました');
  await expect(page.locator('#reply-reply-browser-4')).toContainText('読者にも役立つ回答です。');
  expect(submitted.action).toBe('communityCreateReply');expect(submitted.reply_to).toBe('reply-browser-3');expect(submitted.public_consent).toBe('true');
  expect(JSON.stringify(submitted)).not.toContain('correct-test-password');
  expect(submitted.deletion_key).toBe(crypto.pbkdf2Sync('correct-test-password',Buffer.from(submitted.deletion_salt,'hex'),600000,32,'sha256').toString('hex'));
});
test('deletion is inline and retains the reply number and child relationship',async({page})=>{
  const replies=[example(q),{...example(q,4),reply_to:'reply-browser-3',reply_to_number:3}];const salt='d'.repeat(64);
  await mock(page,values=>{if(values.get('action')==='communityReplyDeleteChallenge')return {ok:true,salt};
    if(values.get('action')==='communityDeleteReply') {const key=crypto.pbkdf2Sync('correct-test-password',Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex');if(values.get('deletion_key')!==key)return {ok:false,code:'INVALID_ACCESS',error:'Invalid access'};replies[0]={...replies[0],deleted:true,nickname:'削除済み',body:''};return {ok:true};}return {ok:true};},replies);
  await page.goto(q.detail_url);const card=page.locator('#reply-reply-browser-3');await card.getByRole('button',{name:'削除',exact:true}).click();
  await card.getByLabel('削除用パスワード',{exact:true}).fill('wrong-password');await card.getByRole('button',{name:'削除を実行'}).click();await expect(card).toContainText('一致しません');
  await card.getByLabel('削除用パスワード',{exact:true}).fill('correct-test-password');await card.getByRole('button',{name:'削除を実行'}).click();await expect(card).toContainText('この返信は削除されました。');await expect(card).toContainText('#3');
  await expect(page.locator('#reply-reply-browser-4')).toContainText('#3への返信');
});
test('private send immediately opens the scoped conversation and routes to the chosen commenter',async({page})=>{
  let submitted;const replies=[example(q)],session='a'.repeat(64);
  await mock(page,values=>{if(values.get('action')==='communityCreateConversation'){submitted=Object.fromEntries(values);return {ok:true,id:'conversation-browser',scope:'conversation',session,notification_pending:true};}
    if(values.get('action')==='communityGetConversation'){expect(values.get('session')).toBe(session);return {ok:true,post_title:q.title,status:'active',other_nickname:'はな',target_reply_id:'reply-browser-3',messages:[],has_more:false};}return {ok:true};},replies);
  await page.goto(q.detail_url);await expect(page.getByLabel('ニックネーム',{exact:true})).toBeEnabled();await fillPublic(page);await page.getByLabel('返信先',{exact:true}).fill('#3');
  await page.getByRole('radio',{name:'非公開返信',exact:true}).check();await composer(page).getByRole('checkbox').check();await page.getByRole('button',{name:'送信する',exact:true}).click();
  await expect(page.locator('#conversationPanel')).toBeVisible();expect(page.url()).not.toContain(session);
  expect(submitted.action).toBe('communityCreateConversation');expect(submitted.reply_to).toBe('reply-browser-3');expect(submitted.deletion_key).toBeUndefined();expect(submitted.private_consent).toBe('true');
  await expect(page.locator('#conversationState')).toContainText('公開返信から始まった');
});
test('old backend disables the new composer without legacy email forwarding',async({page})=>{
  await page.route('https://script.google.com/**',route=>route.fulfill({json:{ok:true,messaging_version:'2026-10-17.1',public_replies:true,private_conversations:true}}));
  await page.goto(q.detail_url);await expect(composer(page).locator('[data-compose-status]')).toContainText('現在利用できません');await expect(page.getByRole('button',{name:'送信する',exact:true})).toBeDisabled();
});
test('email link opens directly, can be reopened and reused in another browser; conversation supports repeated replies',async({page,browser})=>{
  const access='a'.repeat(64), session='b'.repeat(64);let exchanges=0;let sent=0;
  const messages=[{id:'message-1',nickname:'投稿者',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-17T10:00:00Z',mine:false}];
  const handler=(values,request)=>{
    expect(request.method()).toBe('POST');expect(request.url()).not.toContain(access);expect(request.url()).not.toContain(session);
    expect(request.headers()['referer']||'').not.toContain(access);
    switch(values.get('action')){
      case 'communityUseAccess': exchanges++;expect(values.get('access')).toBe(access);return {ok:true,scope:'conversation',id:'conversation-browser',session};
      case 'communityGetConversation': expect(values.get('session')).toBe(session);return {ok:true,post_title:'机の受け渡し',status:'active',other_nickname:'投稿者',messages,has_more:false};
      case 'communitySendMessage': sent++;messages.push({id:'message-'+(sent+1),nickname:'自分',body:values.get('body'),mine:true,created_at:'2026-10-17T11:00:00Z'});return {ok:true};
      default:return {ok:true};
    }
  };
  await mock(page,handler);
  const link='/germany/ja/community/conversation/?kind=conversation&id=conversation-browser#access='+access;
  await page.goto(link);
  await expect(page.locator('#conversationPanel')).toBeVisible();
  expect(exchanges).toBe(1);expect(page.url()).not.toContain('#');expect(page.url()).not.toContain(access);
  expect(await page.locator('script[src*="cookie-consent"],script[src*="social-share"],script[src*="googletagmanager"],script[src*="gtag"]').count()).toBe(0);
  await expect(page.locator('#privateMessages')).toContainText('<img src=x onerror=alert(1)>');
  expect(await page.locator('#privateMessages img').count()).toBe(0);
  for(const body of ['一度目の返信','二度目の返信']){
    await page.locator('#messageBody').fill(body);await page.getByRole('button',{name:'返信する',exact:true}).click();
    await expect(page.locator('#privateMessages')).toContainText(body);
  }
  expect(sent).toBe(2);
  await page.reload();await expect(page.locator('#conversationPanel')).toBeVisible();expect(exchanges).toBe(1);
  await expect(page.locator('#privateMessages .cm-message')).toHaveCount(3);
  // Reopening the same email link later, and in a separate browser, still works.
  await page.goto('about:blank');await page.goto(link);await expect(page.locator('#conversationPanel')).toBeVisible();expect(exchanges).toBe(2);
  const other=await browser.newContext({baseURL:test.info().project.use.baseURL});const second=await other.newPage();await mock(second,handler);
  await second.goto(link);await expect(second.locator('#conversationPanel')).toBeVisible();await expect(second.locator('#privateMessages')).toContainText('二度目の返信');await other.close();
  await page.getByRole('button',{name:'この端末で閉じる',exact:true}).first().click();
  await expect(page.locator('#privateMessages')).toBeEmpty();await expect(page.locator('#recoveryPanel')).toBeVisible();
  await expect(page.locator('#conversationStatus')).toContainText('同じリンクから');
  await assertNoHorizontalOverflow(page);
});
test('invalid, truncated and closed links explain the cause and offer a resend without exposing registered emails',async({page})=>{
  let exchanges=0;
  await mock(page,(values)=> values.get('action')==='communityUseAccess' ? (exchanges++, values.get('id')==='conversation-closed' ? {ok:false,code:'CLOSED',error:'closed'} : {ok:false,code:'INVALID_ACCESS',error:'このリンクでは開けません。リンクが取り消されたか、URLの一部が欠けている可能性があります。'}) : {ok:true,accepted:true});
  await page.goto('/germany/ja/community/conversation/?kind=reply&id=reply-revoked#access='+'f'.repeat(64));
  await expect(page.locator('#conversationStatus')).toContainText('取り消された');
  await expect(page.locator('#recoveryPanel')).toBeVisible();
  await page.getByLabel('メールアドレス',{exact:true}).fill('unknown@example.com');
  await page.getByRole('button',{name:'リンクを再送する',exact:true}).click();
  await expect(page.locator('#conversationStatus')).toContainText('登録内容が一致した場合');
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-cut#access=abc123');
  await expect(page.locator('#conversationStatus')).toContainText('リンクの一部が欠けている');expect(exchanges).toBe(1);expect(page.url()).not.toContain('abc123');
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-closed#access='+'e'.repeat(64));
  await expect(page.locator('#conversationStatus')).toContainText('元の投稿が削除・非公開');
});
test('participant can revoke earlier links and keep using the current tab',async({page})=>{
  const access='a'.repeat(64), first='b'.repeat(64), next='c'.repeat(64);let current=first;
  await mock(page,values=>{
    switch(values.get('action')){
      case 'communityUseAccess': return {ok:true,scope:'conversation',id:'conversation-revoke',session:first};
      case 'communityRevokeAccess': expect(values.get('session')).toBe(first);current=next;return {ok:true,scope:'conversation',id:'conversation-revoke',session:next};
      case 'communityGetConversation': return values.get('session')===current ? {ok:true,post_title:'取消しの確認',status:'active',other_nickname:'相手',messages:[],has_more:false} : {ok:false,code:'INVALID_ACCESS',error:'このリンクでは開けません。'};
      default:return {ok:true};
    }
  });
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-revoke#access='+access);
  await expect(page.locator('#conversationPanel')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('summary',{hasText:'リンクの管理'}).click();
  await page.getByRole('button',{name:'以前のリンクを無効にする',exact:true}).click();
  await expect(page.locator('#conversationStatus')).toContainText('以前のリンクを無効にしました');
  await page.reload();await expect(page.locator('#conversationPanel')).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('jconnect:conversation:conversation:conversation-revoke'))).toBe(next);
});
test('a post published without review appears on the board and its detail page before the static sync',async({page})=>{
  const fresh={...sale,id:'post_live-only',post_id:'post_live-only',title:'同期前の新しい投稿',detail_url:undefined,created_at:'2026-10-21T12:00:00Z',published_at:'2026-10-21T12:00:00Z'};
  let liveReads=0;
  await stubDriveImages(page);
  await page.route('https://script.google.com/**',async route=>{
    const url=new URL(route.request().url());const values=new URLSearchParams(route.request().postData()||url.search);
    const action=values.get('action');
    const data=action==='getPosts'?(liveReads++,{ok:true,items:[fresh,...activeCommunityPosts]}):action==='communityMessagingStatus'?status:action==='communityPublicReplies'?{ok:true,replies:[]}:{ok:true};
    await route.fulfill({json:data,headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await page.goto('/germany/ja/community/');
  await expect(page.getByText('同期前の新しい投稿').first()).toBeVisible();
  await page.goto('/germany/ja/community/post/?id=post_live-only');
  await expect(page.getByRole('heading',{name:'同期前の新しい投稿'})).toBeVisible();
  await expect(composer(page).getByRole('button',{name:'送信する',exact:true})).toBeEnabled();
  expect(liveReads).toBeGreaterThan(0);
});
