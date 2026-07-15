const EMPLOYEES = [
  "冼庆益", "林书任", "陈穗", "刘洪杰", "王小漫",
  "刘春梅", "王飞", "何家智", "陈琼香", "戈九九",
  "林英植", "陈昱志", "杜欢", "刘继兴"
];

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const WEEK_DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let currentYear = 2026;
let currentMonth = 7;
let currentUser = localStorage.getItem('vacation_user') || '';
let vacationData = {};

const userSelect = document.getElementById('user-select');
const monthTitle = document.getElementById('month-title');
const calendar = document.getElementById('calendar');
const toast = document.getElementById('toast');

let toastTimer = null;

// 初始化
function init() {
  populateUsers();
  if (currentUser) {
    userSelect.value = currentUser;
    userSelect.classList.add('has-value');
  }
  userSelect.addEventListener('change', onUserChange);
  document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
  loadMonth();
}

function populateUsers() {
  EMPLOYEES.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    userSelect.appendChild(opt);
  });
}

function onUserChange() {
  currentUser = userSelect.value;
  if (currentUser) {
    localStorage.setItem('vacation_user', currentUser);
    userSelect.classList.add('has-value');
  } else {
    localStorage.removeItem('vacation_user');
    userSelect.classList.remove('has-value');
  }
  renderCalendar();
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  } else if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }
  loadMonth();
}

async function loadMonth() {
  monthTitle.textContent = `${currentYear}年${currentMonth}月`;
  try {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const res = await fetch(`/api/vacations?month=${monthStr}`);
    if (!res.ok) throw new Error('加载失败');
    vacationData = await res.json();
  } catch {
    vacationData = {};
    showToast('加载数据失败，请检查网络', 'error');
  }
  renderCalendar();
}

function renderCalendar() {
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay = new Date(currentYear, currentMonth, 0);
  const daysInMonth = lastDay.getDate();

  // 第一天是星期几（周一=0, 周日=6）
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  let html = '';

  // 表头
  html += '<div class="calendar-header">';
  for (let i = 0; i < 7; i++) {
    const cls = i === 6 ? 'day-name sun' : 'day-name';
    html += `<div class="${cls}">${WEEK_DAYS[i]}</div>`;
  }
  html += '</div>';

  html += '<div class="calendar-grid">';

  // 填充前一个月的空白
  const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
  for (let i = 0; i < startWeekday; i++) {
    const day = prevMonthLastDay - startWeekday + 1 + i;
    html += `<div class="day-cell other-month"><div class="day-number">${day}</div></div>`;
  }

  // 当月的日子
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const today = new Date();
    const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1 && d === today.getDate();
    const dayOfWeek = new Date(currentYear, currentMonth - 1, d).getDay();
    const isSunday = dayOfWeek === 0;

    let cellClass = 'day-cell';
    if (isToday) cellClass += ' today';
    if (isSunday) cellClass += ' sun';

    const slots = vacationData[dateStr] || [];

    html += `<div class="${cellClass}">`;
    html += `<div class="day-number">${d}</div>`;
    html += '<div class="vacation-slots">';

    // 显示已有休假的 slot，最多显示2个
    for (let s = 0; s < 2; s++) {
      if (s < slots.length) {
        const name = slots[s];
        const isMe = name === currentUser;
        const slotClass = isMe ? 'slot filled me' : 'slot filled';
        const onclick = isMe ? ` onclick="removeVacation('${dateStr}', '${name}')"` : '';
        html += `<div class="${slotClass}"${onclick}>`;
        html += name;
        if (isMe) html += '<span class="remove-hint"> ✕</span>';
        html += '</div>';
      } else if (s >= slots.length) {
        // 空 slot
        const canFill = currentUser && slots.length < 2 && !slots.includes(currentUser);
        const cls = canFill ? 'slot empty' : 'slot empty disabled';
        const onclick = canFill ? ` onclick="addVacation('${dateStr}')"` : '';
        const text = canFill ? '+ 填写' : '—';
        html += `<div class="${cls}"${onclick}>${text}</div>`;
      }
    }

    html += '</div></div>';
  }

  // 填充下一月的空白，补全最后一周
  const totalCells = startWeekday + daysInMonth;
  const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="day-cell other-month"><div class="day-number">${i}</div></div>`;
  }

  html += '</div>';
  calendar.innerHTML = html;
}

async function addVacation(dateStr) {
  if (!currentUser) {
    showToast('请先在上方选择你的姓名', 'info');
    return;
  }
  try {
    const res = await fetch('/api/vacations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser, date: dateStr })
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`✅ ${dateStr} 休假已登记`, 'success');
      await loadMonth();
    } else {
      showToast(`❌ ${result.error}`, 'error');
    }
  } catch {
    showToast('网络错误，请重试', 'error');
  }
}

async function removeVacation(dateStr, name) {
  if (!confirm(`确定取消 ${dateStr} 的休假吗？`)) return;
  try {
    const res = await fetch('/api/vacations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser, date: dateStr })
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`已取消 ${dateStr} 的休假`, 'success');
      await loadMonth();
    } else {
      showToast(`❌ ${result.error}`, 'error');
    }
  } catch {
    showToast('网络错误，请重试', 'error');
  }
}

function showToast(message, type) {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// 启动
document.addEventListener('DOMContentLoaded', init);
