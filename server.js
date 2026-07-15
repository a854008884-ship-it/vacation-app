const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const EMPLOYEES = [
  "冼庆益", "林书任", "陈穗", "刘洪杰", "王小漫",
  "刘春梅", "王飞", "何家智", "陈琼香", "戈九九",
  "林英植", "陈昱志", "杜欢", "刘继兴"
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/employees', (req, res) => {
  res.json(EMPLOYEES);
});

app.get('/api/vacations', (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '参数错误，格式为 YYYY-MM' });
  }
  const data = readData();
  res.json(data[month] || {});
});

app.post('/api/vacations', (req, res) => {
  const { name, date } = req.body;
  if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '参数错误' });
  }
  if (!EMPLOYEES.includes(name)) {
    return res.status(403).json({ error: '无权限' });
  }
  const month = date.substring(0, 7);
  const data = readData();
  if (!data[month]) data[month] = {};
  if (!data[month][date]) data[month][date] = [];
  if (data[month][date].includes(name)) {
    return res.status(400).json({ error: '您当天已有休假记录' });
  }
  if (data[month][date].length >= 2) {
    return res.status(400).json({ error: '当天休假名额已满（每日最多2人）' });
  }
  data[month][date].push(name);
  writeData(data);
  res.json({ success: true, date, name });
});

app.delete('/api/vacations', (req, res) => {
  const { name, date } = req.body;
  if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '参数错误' });
  }
  if (!EMPLOYEES.includes(name)) {
    return res.status(403).json({ error: '无权限' });
  }
  const month = date.substring(0, 7);
  const data = readData();
  if (!data[month] || !data[month][date] || !data[month][date].includes(name)) {
    return res.status(400).json({ error: '未找到该休假记录' });
  }
  data[month][date] = data[month][date].filter(n => n !== name);
  if (data[month][date].length === 0) {
    delete data[month][date];
  }
  if (Object.keys(data[month]).length === 0) {
    delete data[month];
  }
  writeData(data);
  res.json({ success: true, date, name });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 休假管理系统已启动！`);
  console.log(`   本机访问: http://localhost:${PORT}`);
  console.log(`   局域网访问: http://你的本机IP:${PORT}`);
  console.log(`   员工人数: ${EMPLOYEES.length} 人`);
});
