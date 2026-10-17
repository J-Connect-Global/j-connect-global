import { expect, test } from '@playwright/test';
import { activeCommunityPosts, assertNoHorizontalOverflow } from './support.mjs';
const q = activeCommunityPosts.find((post) => ['質問', '相談', '質問・相談'].includes(post.category1));
const sale = activeCommunityPosts.find((post) => !['質問', '相談', '質問・相談'].includes(post.category1));
const status = { ok:true, messaging_version:'2026-10-17.1',public_replies:true,private_conversations:true };
async function mock(page, handler) {
  await page.route('https://script.google.com/**', async (route) => {
    const values = new URLSearchParams(route.request().postData() || '');
    const data = values.get('action') === 'communityMessagingStatus' ? status : await handler(values, route.request());
    await route.fulfill({json:data,headers:{'Access-Control-Allow-Origin':'*'}});
  });
}
test('question form explicitly requests consent and never uses legacy email forwarding',async({page})=>{
  let submitted;
  await mock(page, (values) => { submitted=Object.fromEntries(values); return {ok:true,id:'reply-browser',confirmation_required:true}; });
  await page.goto('/germany/ja/community/contact/?post_id='+encodeURIComponent(q.id));
  await expect(page.locator('#contactTitle')).toHaveText('ニックネームで公開返信');
  await expect(page.locator('#publicConsentLabel')).toBeVisible();
  await page.getByLabel('ニックネーム',{exact:true}).fill('ニック');
  await page.getByLabel('確認・通知用メールアドレス（相手に非公開）').fill('browser@example.com');
  await page.getByLabel('返信・メッセージ',{exact:true}).fill('読者にも役立つ回答です。');
  await page.locator('#public_consent').check();
  await page.getByRole('button',{name:'確認メールを送る',exact:true}).click();
  await expect(page.locator('#contactStatus')).toContainText('確認メールを送信しました');
  expect(submitted.action).toBe('communityCreateReply');expect(submitted.public_consent).toBe('true');
  await expect(page.getByRole('link',{name:'メールが届かない・確認ページを開く'})).toHaveAttribute('href',/kind=reply&id=reply-browser/);
  await assertNoHorizontalOverflow(page);
});
test('private inquiry explains account-free repeated replies and no public consent',async({page})=>{
  await mock(page,()=>({ok:true}));
  await page.goto('/germany/ja/community/contact/?post_id='+encodeURIComponent(sale.id));
  await expect(page.locator('#contactTitle')).toHaveText('非公開の会話を始める');
  await expect(page.locator('#contactMode')).toContainText('メールアドレスは相手に表示されません');
  await expect(page.locator('#publicConsentLabel')).toBeHidden();
  await assertNoHorizontalOverflow(page);
});
test('old backend disables contact form without falling back to email forwarding',async({page})=>{
  await page.route('https://script.google.com/**',route=>route.fulfill({json:{ok:false,error:'Unsupported action.'}}));
  await page.goto('/germany/ja/community/contact/?post_id='+encodeURIComponent(q.id));
  await expect(page.locator('#contactForm fieldset')).toBeDisabled();
  await expect(page.locator('#contactStatus')).not.toHaveText('投稿と受付状況を確認中…');
});
test('private access is consumed only by explicit confirmation in a POST body; conversation supports repeated replies',async({page})=>{
  const access='a'.repeat(64), session='b'.repeat(64);let exchanges=0;let sent=0;
  const messages=[{id:'message-1',nickname:'投稿者',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-17T10:00:00Z',mine:false}];
  await mock(page,(values,request)=>{
    expect(request.method()).toBe('POST');expect(request.url()).not.toContain(access);expect(request.url()).not.toContain(session);
    switch(values.get('action')){
      case 'communityUseAccess': exchanges++;expect(values.get('access')).toBe(access);return {ok:true,scope:'conversation',id:'conversation-browser',session};
      case 'communityGetConversation': expect(values.get('session')).toBe(session);return {ok:true,post_title:'机の受け渡し',status:'active',other_nickname:'投稿者',messages,has_more:false};
      case 'communitySendMessage': sent++;messages.push({id:'message-'+(sent+1),nickname:'自分',body:values.get('body'),mine:true,created_at:'2026-10-17T11:00:00Z'});return {ok:true};
      default:return {ok:true};
    }
  });
  await page.goto('/germany/ja/community/conversation/?kind=conversation&id=conversation-browser#access='+access);
  await expect(page.getByRole('button',{name:'確認して開く',exact:true})).toBeVisible();
  expect(exchanges).toBe(0);expect(page.url()).not.toContain('#');
  expect(await page.locator('script[src*="cookie-consent"],script[src*="social-share"]').count()).toBe(0);
  await page.getByRole('button',{name:'確認して開く',exact:true}).click();
  await expect(page.locator('#conversationPanel')).toBeVisible();
  await expect(page.locator('#privateMessages')).toContainText('<img src=x onerror=alert(1)>');
  expect(await page.locator('#privateMessages img').count()).toBe(0);
  for(const body of ['一度目の返信','二度目の返信']){
    await page.locator('#messageBody').fill(body);await page.getByRole('button',{name:'返信する',exact:true}).click();
    await expect(page.locator('#privateMessages')).toContainText(body);
  }
  expect(sent).toBe(2);expect(exchanges).toBe(1);
  await page.reload();await expect(page.locator('#conversationPanel')).toBeVisible();expect(exchanges).toBe(1);
  await page.getByRole('button',{name:'この端末で閉じる',exact:true}).first().click();
  await expect(page.locator('#privateMessages')).toBeEmpty();await expect(page.locator('#recoveryPanel')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
test('expired link displays recovery without exposing registered emails',async({page})=>{
  await mock(page,(values)=> values.get('action')==='communityUseAccess' ? {ok:false,code:'INVALID_ACCESS',error:'リンクの期限が切れているか、使用済みです。'} : {ok:true,accepted:true});
  await page.goto('/germany/ja/community/conversation/?kind=reply&id=reply-expired#access='+'f'.repeat(64));
  await page.getByRole('button',{name:'確認して開く',exact:true}).click();
  await expect(page.locator('#conversationStatus')).toContainText('リンクの期限');
  await expect(page.locator('#recoveryPanel')).toBeVisible();
  await page.getByLabel('メールアドレス',{exact:true}).fill('unknown@example.com');
  await page.getByRole('button',{name:'確認リンクを再送する',exact:true}).click();
  await expect(page.locator('#conversationStatus')).toContainText('登録内容が一致した場合');
});
