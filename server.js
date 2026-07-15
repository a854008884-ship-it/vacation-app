const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ogpngsydleqizexxwftz.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncG5nc3lkbGVxaXpleHh3ZnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMTY3NjAsImV4cCI6MjA5OTY5Mjc2MH0.w3xc6pj_wgZH6k3cdbm16oekMa7QLYDKjawMFznBXkw';

const EMPLOYEES = [
  "冼庆益", "林书任", "陈穗", "刘洪杰", "王小漫",
  "刘春梅", "王飞", "何家智", "陈琼香", "戈九九",
  "林英植", "陈昱志", "杜欢", "刘继兴"
];

async function supFetch(path, options = {}) {
  const url = SUPABASE_URL + path;
  return fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/employees', (req, res) => {
  res.json(EMPLOYEES);
});

app.get('/api/vacations', async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '参数错误' });
  }
  try {
    const resp = await supFetch('/rest/v1/vacations?date=like.' + month + '-*&select=date,name&order=created_at');
    if (!resp.ok) throw new Error('Supabase ' + resp.status);
    const rows = await resp.json();
    const result = {};
    for (const r of rows) {
      if (!result[r.date]) result[r.date] = [];
      result[r.date].push(r.name);
    }
    res.json(result);
  } catch (err) {
    console.error('查询失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

app.post('/api/vacations', async (req, res) => {
  const { name, date } = req.body;
  if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '参数错误' });
  }
  if (!EMPLOYEES.includes(name)) {
    return res.status(403).json({ error: '无权限' });
  }
  try {
    const chk = await supFetch('/rest/v1/vacations?date=eq.' + date + '&select=name');
    const entries = await chk.json();
    if (entries.some(e => e.name === name)) {
      return res.status(400).json({ error: '您当天已有休假记录' });
    }
    if (entries.length >= 2) {
      return res.status(400).json({ error: '当天休假名额已满（每日最多2人）' });
    }
    const ins = await supFetch('/rest/v1/vacations', {
      method: 'POST',
      body: JSON.stringify({ date, name }),
      headers: { Prefer: 'return=minimal' }
    });
    if (!ins.ok) return res.status(500).json({ error: '保存失败' });
    res.json({ success: true, date, name });
  } catch (err) {
    console.error('添加失败:', err);
    res.status(500).json({ error: '添加失败' });
  }
});

app.delete('/api/vacations', async (req, res) => {
  const { name, date } = req.body;
  if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '参数错误' });
  }
  if (!EMPLOYEES.includes(name)) {
    return res.status(403).json({ error: '无权限' });
  }
  try {
    const del = await supFetch(
      '/rest/v1/vacations?date=eq.' + date + '&name=eq.' + encodeURIComponent(name),
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
    );
    if (!del.ok) return res.status(500).json({ error: '取消失败' });
    res.json({ success: true, date, name });
  } catch (err) {
    console.error('取消失败:', err);
    res.status(500).json({ error: '取消失败' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 休假管理系统已启动！');
  console.log('   访问地址: http://localhost:' + PORT);
  console.log('   员工人数: ' + EMPLOYEES.length + ' 人');
  console.log('   数据存储: Supabase 云端');
});
