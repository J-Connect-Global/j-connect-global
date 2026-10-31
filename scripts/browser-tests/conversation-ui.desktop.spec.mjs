import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow } from './support.mjs';
test.use({timezoneId:'Asia/Tokyo'});

const access = 'a'.repeat(64), session = 'b'.repeat(64);
const url = '/germany/ja/community/conversation/?kind=conversation&id=conversation-ui#access=' + access;
const message = (id, body = '会話の本文です。', mine = false) => ({id,body,mine,nickname:mine?'自分':'相手',created_at:'2026-10-18T15:18:00Z'});
const conversation = (messages, extra = {}) => ({ok:true,post_title:'運営テストの投稿',status:'active',other_nickname:'相手',messages,has_more:false,before:messages[0]?.id || '',...extra});
async function setup(page, handler = () => ({ok:true})) {
  await page.route('https://script.google.com/**', async route => {
    const values = new URLSearchParams(route.request().postData() || '');
    const action = values.get('action');
    const data = action === 'communityMessagingStatus' ? {ok:true,messaging_version:'2026-10-18.1',public_replies:true,private_conversations:true} : action === 'communityUseAccess' ? {ok:true,id:'conversation-ui',scope:'conversation',session} : await handler(values);
    await route.fulfill({json:data});
  });
  await page.goto(url);
  await expect(page.locator('#conversationPanel')).toBeVisible();
}

test('both participant views use neutral copy and Berlin summer/winter times even on a Tokyo device',async({page})=>{
  await setup(page,()=>conversation([message('one'),{...message('two'),created_at:'2026-01-18T15:18:00Z'}]));
  await expect(page.locator('#conversationState')).toContainText('相手：相手 さん');
  await expect(page.locator('#conversationState')).not.toContainText('元の投稿者への連絡');
  await expect(page.locator('#privateMessages time').first()).toHaveText('2026/10/18 17:18（ベルリン時間）');
  await expect(page.locator('#privateMessages time').last()).toHaveText('2026/01/18 16:18（ベルリン時間）');
  await expect(page.locator('#conversationIntro')).toBeHidden();
});

test('send feedback stays beside the draft, locks editing, and distinguishes saved messages from a failed refresh',async({page})=>{
  let release, sends=0, reads=0;
  const gate=new Promise(resolve=>{release=resolve;});
  await setup(page,async values=>{
    if(values.get('action')==='communitySendMessage'){sends++;await gate;return {ok:true};}
    if(values.get('action')==='communityGetConversation'){reads++;return reads===1?conversation([message('one')]):{ok:false,code:'UNAVAILABLE',error:'取得できません'};}
    return {ok:true};
  });
  await page.getByLabel('メッセージ（相手だけに表示）',{exact:true}).fill('送信する本文');
  await page.getByRole('button',{name:'返信する',exact:true}).click();
  await expect(page.getByRole('button',{name:'送信中…',exact:true})).toBeDisabled();
  await expect(page.locator('#messageBody')).toBeDisabled();
  await expect(page.locator('#messageStatus')).toContainText('返信を送信しています');
  release();
  await expect(page.locator('#messageStatus')).toContainText('返信を送信し');
  await expect(page.locator('#messageStatus')).toContainText('会話の表示を更新できません');
  await expect(page.getByRole('button',{name:'返信する',exact:true})).toBeEnabled();
  await expect(page.locator('#messageBody')).toBeEmpty();expect(sends).toBe(1);
  await expect(page.locator('#privateMessages')).toContainText('会話の本文');
});

test('failed sends keep the draft and retry key; editing the failed draft changes the key',async({page})=>{
  const requests=[];
  await setup(page,values=>{
    if(values.get('action')==='communityGetConversation')return conversation([]);
    if(values.get('action')==='communitySendMessage'){requests.push({body:values.get('body'),id:values.get('request_id')});return {ok:false,error:'通信テスト失敗'};}
    return {ok:true};
  });
  for(const body of ['同じ本文','同じ本文','変更した本文']){
    await page.locator('#messageBody').fill(body);await page.getByRole('button',{name:'返信する',exact:true}).click();
    await expect(page.locator('#messageStatus')).toContainText('通信テスト失敗');
    await expect(page.locator('#messageBody')).toHaveValue(body);
  }
  expect(requests).toHaveLength(3);expect(requests[0].id).toBe(requests[1].id);expect(requests[2].id).not.toBe(requests[1].id);
});

test('automatic updates preserve the reading position and draft, announce new items, and keep older pages',async({page})=>{
  await page.clock.install();let reads=0;
  const initial=Array.from({length:12},(_,i)=>message('message-'+i,'本文 '+i+'\n'.repeat(3)+'読みやすい会話です。'));
  await setup(page,values=>{
    if(values.get('before'))return conversation([message('old','以前の履歴')]);
    reads++;return conversation(reads===1?initial:[...initial,message('new','自動更新で届いた新着')],{has_more:true});
  });
  await page.locator('#messageBody').fill('書きかけの本文');
  await page.locator('#privateMessages').evaluate(el=>{el.scrollTop=100;});
  const top=await page.locator('#privateMessages').evaluate(el=>el.scrollTop);
  await page.clock.fastForward(60001);
  await expect(page.locator('#privateMessages')).toContainText('自動更新で届いた新着');
  expect(await page.locator('#privateMessages').evaluate(el=>el.scrollTop)).toBe(top);
  await expect(page.locator('#messageBody')).toHaveValue('書きかけの本文');
  await expect(page.getByRole('button',{name:'新しいメッセージを表示（1件）',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'新しいメッセージを表示（1件）',exact:true}).click();
  await expect(page.locator('#showNewMessages')).toBeHidden();
  await page.getByRole('button',{name:'以前のメッセージ',exact:true}).click();
  await expect(page.locator('#privateMessages')).toContainText('以前の履歴');
  await page.getByRole('button',{name:'会話を更新',exact:true}).click();
  await expect(page.getByRole('button',{name:'会話を更新',exact:true})).toBeEnabled();
  await expect(page.locator('#privateMessages')).toContainText('以前の履歴');
  await expect(page.locator('#privateMessages .cm-message')).toHaveCount(14);
});

test('a late update cannot reopen a conversation after closing this device',async({page})=>{
  let release,reads=0;const gate=new Promise(resolve=>{release=resolve;});
  await setup(page,async()=>{if(++reads>1)await gate;return conversation([message('one')]);});
  await page.getByRole('button',{name:'会話を更新',exact:true}).click();
  await expect(page.getByRole('button',{name:'更新中…',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'この端末で閉じる',exact:true}).click();release();
  await expect(page.locator('#refreshMessages')).toHaveText('会話を更新');
  await expect(page.locator('#recoveryPanel')).toBeVisible();
  await expect(page.getByRole('button',{name:'会話を更新',exact:true})).toBeHidden();
  await expect(page.locator('#privateMessages')).toBeEmpty();
});

test('automatic updates pause while the tab is hidden and during a send',async({page})=>{
  await page.clock.install();let reads=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  await setup(page,async values=>{
    if(values.get('action')==='communitySendMessage'){await gate;return {ok:true};}
    reads++;return conversation([message('one')]);
  });
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
  await page.clock.fastForward(60001);expect(reads).toBe(1);
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}));
  await page.clock.fastForward(55000);
  await page.locator('#messageBody').fill('送信中に取得しない');await page.getByRole('button',{name:'返信する',exact:true}).click();
  await page.clock.fastForward(5001);expect(reads).toBe(1);
  release();await expect(page.locator('#messageStatus')).toContainText(/返信を送信し、相手にメールで通知しました|返信を保存しました。通知メールは再試行中です。/);expect(reads).toBe(2);
});

test('background failure keeps history and draft; ending the conversation stops automatic reads',async({page})=>{
  await page.clock.install();let reads=0;
  await setup(page,()=>{reads++;return reads===1?conversation([message('one')]):reads===2?{ok:false,error:'一時的な取得失敗'}:conversation([message('one')],{status:'closed'});});
  await page.locator('#messageBody').fill('消さない本文');
  await page.clock.fastForward(60001);
  await expect(page.locator('#conversationUpdates')).toContainText('新着を確認できません');
  await expect(page.locator('#messageBody')).toHaveValue('消さない本文');
  await expect(page.locator('#privateMessages')).toContainText('会話の本文');
  await page.clock.fastForward(60001);
  await expect(page.locator('#messageForm')).toBeHidden();const last=reads;
  await page.clock.fastForward(180000);expect(reads).toBe(last);
  await assertNoHorizontalOverflow(page);
});
