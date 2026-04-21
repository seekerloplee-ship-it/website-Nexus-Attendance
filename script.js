/**
 * Nexus Attendance v2.0
 * ລະບົບກວດລາຍຊື່ນັກຮຽນ
 */


const DEFAULT_CLASSES = [
    { id: 'cls_1', name: 'ม.5/1 วิทยาศาสตร์' },
    { id: 'cls_2', name: 'ม.5/2 คณิตศาสตร์' },
];

const DEFAULT_STUDENTS = [
    { id: '01', name: 'นายสมชาย ใจดี', gender: 'ชาย', phone: '0812345678', profilePic: '', classId: 'cls_1' },
    { id: '02', name: 'นางสาวสุดา มีสุข', gender: 'หญิง', phone: '0898765432', profilePic: '', classId: 'cls_1' },
    { id: '03', name: 'นายวิชัย แสงสว่าง', gender: 'ชาย', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '04', name: 'นางสาวนภา ฟ้าใส', gender: 'หญิง', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '05', name: 'นายธนกร ศรีทอง', gender: 'ชาย', phone: '0851234567', profilePic: '', classId: 'cls_1' },
    { id: '06', name: 'นางสาวพิมพ์พร ดาวเด่น', gender: 'หญิง', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '07', name: 'นายกิตติพงษ์ รุ่งเรือง', gender: 'ชาย', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '08', name: 'นางสาวอรนุช เพ็ชรรัตน์', gender: 'หญิง', phone: '0809876543', profilePic: '', classId: 'cls_1' },
    { id: '09', name: 'นายภูผา ยอดดอย', gender: 'ชาย', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '10', name: 'นางสาวจิราภรณ์ สุขใจ', gender: 'หญิง', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '11', name: 'นายอนุรักษ์ ธรรมดี', gender: 'ชาย', phone: '0871234567', profilePic: '', classId: 'cls_1' },
    { id: '12', name: 'นางสาวกัลยา พฤกษา', gender: 'หญิง', phone: '', profilePic: '', classId: 'cls_1' },
    { id: '01', name: 'นายประเสริฐ นาคา', gender: 'ชาย', phone: '', profilePic: '', classId: 'cls_2' },
    { id: '02', name: 'นางสาวสิรินทร์ โกศัย', gender: 'หญิง', phone: '', profilePic: '', classId: 'cls_2' },
    { id: '03', name: 'นายทิวา ทุ่งกว้าง', gender: 'ชาย', phone: '0861234567', profilePic: '', classId: 'cls_2' },
    { id: '04', name: 'นางสาวปิยะพร บุญมี', gender: 'หญิง', phone: '', profilePic: '', classId: 'cls_2' },
    { id: '05', name: 'นายณัฐวุฒิ ศักดิ์ดี', gender: 'ชาย', phone: '', profilePic: '', classId: 'cls_2' },
];

const DEFAULT_SETTINGS = {
    startTime: '08:00',
    lateMinutes: 15,
    teacherName: '',
    schoolName: '',
};

// =====================================================
// STATE
// =====================================================
let state = {
    classes: [],
    students: [],
    sessions: {},      // { "classId_YYYY-MM-DD": { studentId: { status, note, time } } }
    settings: { ...DEFAULT_SETTINGS },
    currentClassId: null,
    currentView: 'attendance',
    editingStudentKey: null,  // "classId_studentId"
};

let donutChart = null;
let barChart = null;
let confirmCallback = null;

// =====================================================
// PERSISTENCE
// =====================================================
function saveState() {
    localStorage.setItem('nexus_v2_classes',   JSON.stringify(state.classes));
    localStorage.setItem('nexus_v2_students',  JSON.stringify(state.students));
    localStorage.setItem('nexus_v2_sessions',  JSON.stringify(state.sessions));
    localStorage.setItem('nexus_v2_settings',  JSON.stringify(state.settings));
    localStorage.setItem('nexus_v2_lastClass', state.currentClassId || '');
}

function loadState() {
    const classes   = localStorage.getItem('nexus_v2_classes');
    const students  = localStorage.getItem('nexus_v2_students');
    const sessions  = localStorage.getItem('nexus_v2_sessions');
    const settings  = localStorage.getItem('nexus_v2_settings');
    const lastClass = localStorage.getItem('nexus_v2_lastClass');

    state.classes   = classes  ? JSON.parse(classes)  : [...DEFAULT_CLASSES];
    state.students  = students ? JSON.parse(students) : [...DEFAULT_STUDENTS];
    state.sessions  = sessions ? JSON.parse(sessions) : {};
    state.settings  = settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : { ...DEFAULT_SETTINGS };
    state.currentClassId = (lastClass && state.classes.find(c => c.id === lastClass))
        ? lastClass
        : (state.classes[0]?.id || null);
}

// =====================================================
// HELPERS
// =====================================================
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function getSelectedDate() {
    return document.getElementById('attendance-date')?.value || getTodayStr();
}

function getSessionKey(classId, dateStr) {
    return `${classId}_${dateStr}`;
}

function getSessionData(classId, dateStr) {
    const key = getSessionKey(classId, dateStr);
    return state.sessions[key] || {};
}

function setSessionEntry(classId, dateStr, studentId, data) {
    const key = getSessionKey(classId, dateStr);
    if (!state.sessions[key]) state.sessions[key] = {};
    state.sessions[key][studentId] = { ...state.sessions[key][studentId], ...data };
}

function getStudentsForClass(classId) {
    return state.students.filter(s => s.classId === classId);
}

function getStatusText(status) {
    switch (status) {
        case 'present': return 'ມາຮຽນ';
        case 'late':    return 'ມາຊ້າ';
        case 'absent':  return 'ຂາດຮຽນ';
        case 'leave':   return 'ລາ';
        default:        return 'ຍັງບໍ່ກວດ';
    }
}

function getInitials(name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 3) return (parts[1][0] + parts[2][0]).toUpperCase();
    if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0]?.toUpperCase() || '?';
}

function formatTime(isoStr) {
    if (!isoStr) return '-';
    try {
        return new Date(isoStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
}

function formatDateTH(dateStr) {
    if (!dateStr) return '';
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// =====================================================
// TOAST
// =====================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icons = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info:    'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.success} toast-icon"></i>
        <span class="toast-msg">${message}</span>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// =====================================================
// CONFIRM DIALOG
// =====================================================
function showConfirm(title, message, onConfirm, dangerous = true) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const icon = document.getElementById('confirm-icon');
    const okBtn = document.getElementById('btn-confirm-ok');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    cancelBtn.textContent = 'ຍົກເລີກ';
    if (dangerous) {
        icon.style.background = 'rgba(239,68,68,0.1)';
        icon.style.borderColor = 'rgba(239,68,68,0.25)';
        icon.style.color = 'var(--status-absent)';
        icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        okBtn.className = 'btn btn-danger';
        okBtn.textContent = 'ຢືນຢັນ';
    } else {
        icon.style.background = 'rgba(124,58,237,0.1)';
        icon.style.borderColor = 'rgba(124,58,237,0.25)';
        icon.style.color = 'var(--accent-primary)';
        icon.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
        okBtn.className = 'btn btn-primary';
        okBtn.textContent = 'ຕົກລົງ';
    }
    confirmCallback = onConfirm;
    openModal('confirm-modal');
}

// =====================================================
// MODAL HELPERS
// =====================================================
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

// =====================================================
// VIEW SWITCHING
// =====================================================
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${viewId}`);
    if (view) view.classList.add('active');

    const nav = document.getElementById(`nav-${viewId}`);
    if (nav) nav.classList.add('active');

    const viewLabels = { attendance: 'ກວດລາຍຊື່', history: 'ປະຫວັດ', report: 'ລາຍງານ', students: 'ນັກຮຽນ', settings: 'ຕັ້ງຄ່າ' };
    document.getElementById('breadcrumb-label').textContent = viewLabels[viewId] || viewId;
    state.currentView = viewId;

    // Update relevant view data
    if (viewId === 'report')    renderReports();
    if (viewId === 'students')  renderStudentsTable();
    if (viewId === 'history')   renderHistory();
    if (viewId === 'settings')  renderSettingsView();

    // Close sidebar on mobile
    if (window.innerWidth < 900) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// =====================================================
// CLASS SELECTOR
// =====================================================
function renderClassSelector() {
    const sel = document.getElementById('class-selector');
    sel.innerHTML = '';
    state.classes.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls.id;
        opt.textContent = cls.name;
        sel.appendChild(opt);
    });
    if (state.currentClassId) sel.value = state.currentClassId;
}

// =====================================================
// ATTENDANCE RENDER
// =====================================================
function renderAttendanceView() {
    const classId = state.currentClassId;
    const dateStr = getSelectedDate();
    const students = getStudentsForClass(classId);
    const session  = getSessionData(classId, dateStr);

    updateDashboard(students, session);
    renderStudentList(students, session);
    updateProgressBar(students, session);
}

function getFilteredStudents(students, session) {
    const term   = document.getElementById('search-student')?.value.toLowerCase() || '';
    const filter = document.getElementById('filter-status')?.value || 'all';

    return students.filter(s => {
        const status = session[s.id]?.status || 'none';
        const matchSearch = s.name.toLowerCase().includes(term) || s.id.includes(term);
        const matchFilter = filter === 'all' || status === filter;
        return matchSearch && matchFilter;
    });
}

function renderStudentList(students, session) {
    const list = document.getElementById('student-list');
    const filtered = getFilteredStudents(students, session);

    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = `<div class="loading-state">
            <i class="fa-solid fa-magnifying-glass-minus"></i>
            <p>ບໍ່ພົບລາຍຊື່ທີ່ຄົ້ນຫາ</p>
        </div>`;
        return;
    }

    filtered.forEach((student, idx) => {
        const entry  = session[student.id] || { status: 'none', note: '', time: null };
        const card   = document.createElement('div');
        card.className = `student-card glass-panel${entry.status !== 'none' ? ' status-' + entry.status : ''}`;
        card.dataset.id = student.id;

        // Avatar HTML
        const initials = getInitials(student.name);
        let avatarHtml = `<div class="student-avatar-placeholder">${initials}</div>`;
        if (student.profilePic) {
            avatarHtml = `<div class="student-avatar-placeholder">
                <img src="${student.profilePic}" alt="${student.name}" class="student-img-profile" onerror="this.style.display='none'">
            </div>`;
        }

        card.innerHTML = `
            <div class="student-id">${student.id}</div>
            <div class="student-name">
                ${avatarHtml}
                <span>${student.name}</span>
            </div>
            <div class="col-status">
                <div class="status-toggles">
                    <button class="status-btn btn-present ${entry.status === 'present' ? 'active' : ''}" data-status="present">ມາ</button>
                    <button class="status-btn btn-late    ${entry.status === 'late'    ? 'active' : ''}" data-status="late">ຊ້າ</button>
                    <button class="status-btn btn-absent  ${entry.status === 'absent'  ? 'active' : ''}" data-status="absent">ຂາດ</button>
                    <button class="status-btn btn-leave   ${entry.status === 'leave'   ? 'active' : ''}" data-status="leave">ລາ</button>
                </div>
            </div>
            <div class="student-note">
                <input type="text" placeholder="ໝາຍເຫດ..." value="${entry.note || ''}" data-id="${student.id}">
            </div>
            <div class="col-time">${formatTime(entry.time)}</div>
            <div class="col-actions">
                <button class="btn-edit-student" data-id="${student.id}" title="แก้ไขข้อมูล"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete-student" data-id="${student.id}" title="ลบนักเรียน"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        // Status toggle events
        card.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newStatus = btn.dataset.status;
                const classId   = state.currentClassId;
                const dateStr   = getSelectedDate();
                const curStatus = getSessionData(classId, dateStr)[student.id]?.status || 'none';
                const finalStatus = (curStatus === newStatus) ? 'none' : newStatus;

                setSessionEntry(classId, dateStr, student.id, {
                    status: finalStatus,
                    time: finalStatus !== 'none' ? new Date().toISOString() : null,
                });

                // Update card UI fast (without full re-render)
                const session2 = getSessionData(classId, dateStr);
                const students2 = getStudentsForClass(classId);
                updateCardUI(card, student.id, session2[student.id] || { status: 'none' });
                updateDashboard(students2, session2);
                updateProgressBar(students2, session2);
            });
        });

        // Note input event
        card.querySelector('.student-note input').addEventListener('input', (e) => {
            setSessionEntry(state.currentClassId, getSelectedDate(), student.id, { note: e.target.value });
        });

        // Profile pic click
        const imgEl = card.querySelector('.student-img-profile');
        if (imgEl) {
            imgEl.addEventListener('click', () => {
                document.getElementById('view-photo-img').src = imgEl.src;
                document.getElementById('view-photo-name').textContent = student.name;
                openModal('view-photo-modal');
            });
        }

        // Edit button
        card.querySelector('.btn-edit-student').addEventListener('click', () => {
            openStudentModal(student);
        });

        // Delete button
        card.querySelector('.btn-delete-student').addEventListener('click', () => {
            showConfirm(
                'ລົບນັກຮຽນ',
                `ຕ້ອງການລົບ "${student.name}" ແລະຂໍ້ມູນການກວດລາຍຊື່ທັງໝົດຂອງນັກຮຽນຄົນນີ້ໃຊ່ໄຫມ?`,
                () => {
                    state.students = state.students.filter(
                        s => !(s.id === student.id && s.classId === student.classId)
                    );
                    // Remove from all sessions
                    Object.keys(state.sessions).forEach(key => {
                        if (key.startsWith(student.classId + '_') && state.sessions[key][student.id]) {
                            delete state.sessions[key][student.id];
                        }
                    });
                    saveState();
                    renderAttendanceView();
                    renderStudentsTable();
                    showToast(`ລົບ ${student.name} ຮຽບຮ້ອຍ`);
                }
            );
        });

        list.appendChild(card);
    });
}

function updateCardUI(card, studentId, entry) {
    const statuses = ['present', 'late', 'absent', 'leave'];
    card.className = `student-card glass-panel${entry.status !== 'none' ? ' status-' + entry.status : ''}`;
    card.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === entry.status);
    });
    card.querySelector('.col-time').textContent = formatTime(entry.time);
}

function updateDashboard(students, session) {
    const total   = students.length;
    const present = students.filter(s => session[s.id]?.status === 'present').length;
    const late    = students.filter(s => session[s.id]?.status === 'late').length;
    const absent  = students.filter(s => session[s.id]?.status === 'absent').length;
    const leave   = students.filter(s => session[s.id]?.status === 'leave').length;
    const pct     = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';

    setElText('total-count',   total);
    setElText('present-count', present);
    setElText('late-count',    late);
    setElText('absent-count',  absent);
    setElText('leave-count',   leave);
    setElText('present-pct',   pct(present));
    setElText('late-pct',      pct(late));
    setElText('absent-pct',    pct(absent));
    setElText('leave-pct',     pct(leave));
}

function updateProgressBar(students, session) {
    const total   = students.length;
    const checked = students.filter(s => session[s.id]?.status && session[s.id].status !== 'none').length;
    const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
    const fill    = document.getElementById('progress-bar-fill');
    if (fill) fill.style.width = pct + '%';
    setElText('progress-text', `${checked} / ${total} ຄົນ`);
}

function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// =====================================================
// REPORTS
// =====================================================
function renderReports() {
    const classId = state.currentClassId;
    const dateStr = getSelectedDate();
    const students = getStudentsForClass(classId);
    const session  = getSessionData(classId, dateStr);

    renderDonutChart(students, session);
    renderStudentStatsReport(students, classId);
    renderBarChart(classId, students);
}

function renderDonutChart(students, session) {
    const counts = {
        present: students.filter(s => session[s.id]?.status === 'present').length,
        late:    students.filter(s => session[s.id]?.status === 'late').length,
        absent:  students.filter(s => session[s.id]?.status === 'absent').length,
        leave:   students.filter(s => session[s.id]?.status === 'leave').length,
    };
    const unchecked = students.length - Object.values(counts).reduce((a, b) => a + b, 0);

    const ctx = document.getElementById('donut-chart')?.getContext('2d');
    if (!ctx) return;

    if (donutChart) donutChart.destroy();

    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['ມາຮຽນ', 'ມາຊ້າ', 'ຂາດຮຽນ', 'ລາ', 'ຍັງບໍ່ກວດ'],
            datasets: [{
                data: [counts.present, counts.late, counts.absent, counts.leave, unchecked],
                backgroundColor: ['#10b981','#f59e0b','#ef4444','#3b82f6','#30354d'],
                borderColor: ['#065f46','#92400e','#991b1b','#1e40af','#1e2235'],
                borderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} คน`
                    },
                    backgroundColor: 'rgba(10,10,20,0.9)',
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' },
                }
            }
        }
    });

    // Legend
    const legend = document.getElementById('chart-legend');
    if (legend) {
        const items = [
            { label: 'ມາຮຽນ',    color: '#10b981', count: counts.present },
            { label: 'ມາຊ້າ',    color: '#f59e0b', count: counts.late },
            { label: 'ຂາດຮຽນ',  color: '#ef4444', count: counts.absent },
            { label: 'ລາ',      color: '#3b82f6', count: counts.leave },
            { label: 'ຍັງບໍ່ກວດ', color: '#30354d', count: unchecked },
        ];
        legend.innerHTML = items.map(it => `
            <div class="legend-item">
                <div class="legend-dot" style="background:${it.color}"></div>
                <span>${it.label} (${it.count})</span>
            </div>
        `).join('');
    }
}

function renderStudentStatsReport(students, classId) {
    const container = document.getElementById('student-stats-list');
    if (!container) return;

    // Compute per-student attendance across all sessions for this class
    const sessionKeys = Object.keys(state.sessions).filter(k => k.startsWith(classId + '_'));
    const totalDays = sessionKeys.length;

    if (totalDays === 0) {
        container.innerHTML = `<div class="loading-state" style="padding:2rem;">
            <i class="fa-solid fa-calendar-xmark"></i>
            <p>ຍັງບໍ່ມີຂໍ້ມູນການກວດລາຍຊື່ສະສົມ</p>
        </div>`;
        return;
    }

    const rows = students.map(student => {
        let presentDays = 0;
        let totalChecked = 0;
        sessionKeys.forEach(key => {
            const entry = state.sessions[key][student.id];
            if (entry && entry.status !== 'none') {
                totalChecked++;
                if (entry.status === 'present' || entry.status === 'late') presentDays++;
            }
        });
        const pct = totalChecked > 0 ? Math.round((presentDays / totalChecked) * 100) : 0;
        return { student, presentDays, totalChecked, totalDays, pct };
    }).sort((a, b) => a.pct - b.pct);

    container.innerHTML = rows.map(r => `
        <div class="student-stat-row">
            <div class="student-stat-name">${r.student.name}</div>
            <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${r.pct}%"></div>
            </div>
            <div class="student-stat-pct ${r.pct < 50 ? 'danger' : ''}">${r.pct}%</div>
        </div>
    `).join('');
}

function renderBarChart(classId, students) {
    const ctx = document.getElementById('bar-chart')?.getContext('2d');
    if (!ctx) return;

    if (barChart) barChart.destroy();

    // Get last 7 unique dates for this class
    const sessionKeys = Object.keys(state.sessions)
        .filter(k => k.startsWith(classId + '_'))
        .sort()
        .slice(-7);

    if (sessionKeys.length === 0) return;

    const labels = sessionKeys.map(k => formatDateTH(k.replace(classId + '_', '')));
    const presentData = sessionKeys.map(k => {
        const s = state.sessions[k];
        return Object.values(s).filter(e => e.status === 'present' || e.status === 'late').length;
    });
    const absentData = sessionKeys.map(k => {
        const s = state.sessions[k];
        return Object.values(s).filter(e => e.status === 'absent').length;
    });

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'ມາຮຽນ',
                    data: presentData,
                    backgroundColor: 'rgba(16,185,129,0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6,
                },
                {
                    label: 'ຂາດຮຽນ',
                    data: absentData,
                    backgroundColor: 'rgba(239,68,68,0.6)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#8a90aa', font: { family: 'Outfit' }, stepSize: 1 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: '#8a90aa', font: { family: 'Outfit', size: 10 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#8a90aa', font: { family: 'Outfit' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(10,10,20,0.9)',
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' },
                }
            }
        }
    });
}

// =====================================================
// HISTORY
// =====================================================
function renderHistory() {
    const classId = state.currentClassId;
    const fromDate = document.getElementById('history-date-from')?.value || '';
    const toDate   = document.getElementById('history-date-to')?.value   || '';

    const sessionKeys = Object.keys(state.sessions)
        .filter(k => k.startsWith(classId + '_'))
        .sort()
        .reverse();

    const list = document.getElementById('history-list');
    if (!list) return;

    const filtered = sessionKeys.filter(k => {
        const date = k.replace(classId + '_', '');
        if (fromDate && date < fromDate) return false;
        if (toDate   && date > toDate)   return false;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="loading-state">
            <i class="fa-solid fa-calendar-xmark"></i>
            <p>ບໍ່ພົບປະຫວັດການກວດລາຍຊື່</p>
        </div>`;
        return;
    }

    const className = state.classes.find(c => c.id === classId)?.name || '';
    list.innerHTML = filtered.map(key => {
        const date = key.replace(classId + '_', '');
        const session = state.sessions[key];
        const entries = Object.values(session);
        const presentCount = entries.filter(e => e.status === 'present').length;
        const lateCount    = entries.filter(e => e.status === 'late').length;
        const absentCount  = entries.filter(e => e.status === 'absent').length;
        const leaveCount   = entries.filter(e => e.status === 'leave').length;

        return `
        <div class="history-item" data-key="${key}" data-date="${date}">
            <div class="history-date">${formatDateTH(date)}</div>
            <div class="history-class"><i class="fa-solid fa-school"></i> ${className}</div>
            <div class="history-badges">
                ${presentCount > 0 ? `<span class="history-badge b-present">ມາຮຽນ ${presentCount}</span>` : ''}
                ${lateCount    > 0 ? `<span class="history-badge b-late">ມາຊ້າ ${lateCount}</span>` : ''}
                ${absentCount  > 0 ? `<span class="history-badge b-absent">ຂາດຮຽນ ${absentCount}</span>` : ''}
                ${leaveCount   > 0 ? `<span class="history-badge b-leave">ລາ ${leaveCount}</span>` : ''}
            </div>
            <button class="btn btn-outline" style="margin-left:auto;font-size:0.8rem;padding:0.4rem 0.875rem;" onclick="loadHistorySession('${key}','${date}')">
                <i class="fa-solid fa-eye"></i> ເບິ່ງລາຍລະອຽດ
            </button>
        </div>`;
    }).join('');
}

function loadHistorySession(key, date) {
    // Switch to attendance view with this date loaded
    document.getElementById('attendance-date').value = date;
    switchView('attendance');
    renderAttendanceView();
    showToast(`ໂຫຼດຂໍ້ມູນວັນທີ ${formatDateTH(date)} ແລ້ວ`, 'info');
}

// =====================================================
// STUDENT TABLE (Students view)
// =====================================================
function renderStudentsTable() {
    const classId  = state.currentClassId;
    const students = getStudentsForClass(classId);
    const tbody    = document.getElementById('students-table-body');
    if (!tbody) return;

    // Compute attendance aggregates per student
    const sessionKeys = Object.keys(state.sessions).filter(k => k.startsWith(classId + '_'));

    tbody.innerHTML = students.length === 0
        ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem;">ຍັງບໍ່ມີນັກຮຽນໃນຫ້ອງນີ້</td></tr>`
        : students.map(student => {
            let pCount = 0, aCount = 0, lCount = 0;
            sessionKeys.forEach(key => {
                const s = state.sessions[key][student.id]?.status;
                if (s === 'present') pCount++;
                else if (s === 'absent') aCount++;
                else if (s === 'leave') lCount++;
            });

            const initials = getInitials(student.name);
            let avatar = `<div class="student-avatar-placeholder">${initials}</div>`;
            if (student.profilePic) {
                avatar = `<div class="student-avatar-placeholder">
                    <img src="${student.profilePic}" alt="" class="student-img-profile" style="cursor:default;" onerror="this.style.display='none'">
                </div>`;
            }

            const gBadge = student.gender === 'ชาย' || student.gender === 'ຊາຍ'
                ? `<span class="table-badge badge-male">ຊາຍ</span>`
                : `<span class="table-badge badge-female">ຍິງ</span>`;

            return `<tr>
                <td>${student.id}</td>
                <td>${avatar}</td>
                <td style="font-weight:500;">${student.name}</td>
                <td>${gBadge}</td>
                <td style="color:var(--text-muted);font-size:0.85rem;">${student.phone || '-'}</td>
                <td><span class="table-badge badge-present">${pCount} ວັນ</span></td>
                <td><span class="table-badge badge-absent">${aCount} ວັນ</span></td>
                <td><span class="table-badge badge-leave">${lCount} ວັນ</span></td>
                <td>
                    <div class="col-actions">
                        <button class="btn-edit-student" onclick="openStudentModalFromTable('${student.id}','${classId}')" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-delete-student" onclick="deleteStudentFromTable('${student.id}','${classId}')" title="ลบ"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
}

function openStudentModalFromTable(studentId, classId) {
    const student = state.students.find(s => s.id === studentId && s.classId === classId);
    if (student) openStudentModal(student);
}

function deleteStudentFromTable(studentId, classId) {
    const student = state.students.find(s => s.id === studentId && s.classId === classId);
    if (!student) return;
    showConfirm(
        t('confirm.deleteStudent'),
        t('confirm.deleteStudentTable', { name: student.name }),
        () => {
            state.students = state.students.filter(s => !(s.id === studentId && s.classId === classId));
            Object.keys(state.sessions).forEach(key => {
                if (key.startsWith(classId + '_') && state.sessions[key][studentId]) {
                    delete state.sessions[key][studentId];
                }
            });
            saveState();
            renderStudentsTable();
            renderAttendanceView();
            showToast(`ລົບ ${student.name} ຮຽບຮ້ອຍ`);
        }
    );
}

// =====================================================
// STUDENT MODAL (Add / Edit)
// =====================================================
function openStudentModal(student = null) {
    const title = document.getElementById('student-modal-title');
    const idInput    = document.getElementById('new-student-id');
    const nameInput  = document.getElementById('new-student-name');
    const genderSel  = document.getElementById('new-student-gender');
    const phoneInput = document.getElementById('new-student-phone');
    const preview    = document.getElementById('avatar-preview');
    const picInput   = document.getElementById('new-student-pic');

    picInput.value = '';
    preview.innerHTML = '<i class="fa-solid fa-user"></i>';
    preview.style.backgroundImage = '';

    if (student) {
        title.textContent = 'ແກ້ໄຂຂໍ້ມູນນັກຮຽນ';
        idInput.value    = student.id;
        nameInput.value  = student.name;
        genderSel.value  = student.gender || 'ชาย';
        phoneInput.value = student.phone  || '';
        state.editingStudentKey = `${student.classId}_${student.id}`;
        if (student.profilePic) {
            preview.innerHTML = `<img src="${student.profilePic}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
    } else {
        title.textContent = 'ເພີ່ມນັກຮຽນໃໝ່';
        idInput.value    = '';
        nameInput.value  = '';
        genderSel.value  = 'ชาย';
        phoneInput.value = '';
        state.editingStudentKey = null;
    }

    openModal('student-modal');
    setTimeout(() => nameInput.focus(), 200);
}

// =====================================================
// SETTINGS VIEW
// =====================================================
function renderSettingsView() {
    document.getElementById('setting-start-time').value   = state.settings.startTime;
    document.getElementById('setting-late-mins').value    = state.settings.lateMinutes;
    document.getElementById('setting-teacher-name').value = state.settings.teacherName;
    document.getElementById('setting-school-name').value  = state.settings.schoolName;
    renderSettingsClassList();
}

function renderSettingsClassList() {
    const container = document.getElementById('settings-class-list');
    if (!container) return;
    container.innerHTML = state.classes.map(cls => `
        <div class="class-list-item">
            <span>${cls.name}</span>
            <button class="btn-delete-class" onclick="deleteClass('${cls.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('') || `<p style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">ຍັງບໍ່ມີຫ້ອງຮຽນ</p>`;
}

function deleteClass(classId) {
    if (state.classes.length <= 1) {
        showToast('ຕ້ອງມີຫ້ອງຮຽນຢ່າງໜ້ອຍ 1 ຫ້ອງ', 'warning');
        return;
    }
    const cls = state.classes.find(c => c.id === classId);
    showConfirm(
        'ລົບຫ້ອງຮຽນ',
        `ລົບ "${cls?.name}" ຈະລົບນັກຮຽນ ແລະ ຂໍ້ມູນການກວດລາຍຊື່ທັງໝົດຂອງຫ້ອງນີ້ດ້ວຍ`,
        () => {
            state.classes   = state.classes.filter(c => c.id !== classId);
            state.students  = state.students.filter(s => s.classId !== classId);
            Object.keys(state.sessions).forEach(key => {
                if (key.startsWith(classId + '_')) delete state.sessions[key];
            });
            if (state.currentClassId === classId) {
                state.currentClassId = state.classes[0]?.id || null;
            }
            saveState();
            renderClassSelector();
            renderSettingsClassList();
            renderAttendanceView();
            showToast('ລົບຫ້ອງຮຽນຮຽບຮ້ອຍ');
        }
    );
}

// =====================================================
// EXPORT
// =====================================================
function exportCSV() {
    const classId   = state.currentClassId;
    const dateStr   = getSelectedDate();
    const students  = getStudentsForClass(classId);
    const session   = getSessionData(classId, dateStr);
    const className = state.classes.find(c => c.id === classId)?.name || 'ไม่ระบุ';

    let csv = '\uFEFF'; // BOM for Thai charset
    csv += `"ข้อมูล","${className}"\n`;
    csv += `"วันที่","${formatDateTH(dateStr)}"\n`;
    csv += `"ครู","${state.settings.teacherName || '-'}"\n\n`;
    csv += '"ลำดับ","ชื่อ-นามสกุล","เพศ","สถานะ","เวลา","หมายเหตุ"\n';

    students.forEach(s => {
        const entry = session[s.id] || { status: 'none', note: '', time: null };
        const name  = `"${s.name.replace(/"/g, '""')}"`;
        const note  = `"${(entry.note || '').replace(/"/g, '""')}"`;
        csv += `"${s.id}",${name},"${s.gender || '-'}","${getStatusText(entry.status)}","${formatTime(entry.time)}",${note}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendance_${classId}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ດາວໂຫຼດ CSV ຮຽບຮ້ອຍ', 'success');
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { showToast('ไม่พบไลบรารี jsPDF', 'error'); return; }

    const classId   = state.currentClassId;
    const dateStr   = getSelectedDate();
    const students  = getStudentsForClass(classId);
    const session   = getSessionData(classId, dateStr);
    const className = state.classes.find(c => c.id === classId)?.name || 'ไม่ระบุ';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(18);
    doc.setTextColor(124, 58, 237);
    doc.text('Attendance Report', 20, 22);

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 80);
    doc.text(`Class: ${className}`, 20, 32);
    doc.text(`Date: ${formatDateTH(dateStr)}`, 20, 39);
    if (state.settings.teacherName) doc.text(`Teacher: ${state.settings.teacherName}`, 20, 46);
    if (state.settings.schoolName)  doc.text(`School: ${state.settings.schoolName}`, 20, 53);

    // Table Header
    let y = 65;
    doc.setFillColor(33, 28, 54);
    doc.rect(15, y - 6, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('#', 18, y);
    doc.text('Name', 28, y);
    doc.text('Status', 130, y);
    doc.text('Time', 160, y);
    doc.text('Note', 175, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    const statusColors = {
        present: [16, 185, 129],
        late:    [245, 158, 11],
        absent:  [239, 68, 68],
        leave:   [59, 130, 246],
        none:    [100, 100, 120],
    };

    students.forEach((s, i) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        const entry = session[s.id] || { status: 'none', note: '', time: null };
        const bg = i % 2 === 0 ? [15, 15, 28] : [20, 20, 36];
        doc.setFillColor(...bg);
        doc.rect(15, y - 4, 180, 7, 'F');

        doc.setTextColor(200, 200, 220);
        doc.text(s.id, 18, y);
        doc.text(s.name.substring(0, 35), 28, y);

        const [r, g, b] = statusColors[entry.status] || statusColors.none;
        doc.setTextColor(r, g, b);
        doc.text(getStatusText(entry.status), 130, y);

        doc.setTextColor(160, 160, 180);
        doc.text(formatTime(entry.time), 160, y);
        doc.text((entry.note || '').substring(0, 15), 175, y);
        y += 7;
    });

    // Summary
    y += 6;
    const present = students.filter(s => session[s.id]?.status === 'present').length;
    const late    = students.filter(s => session[s.id]?.status === 'late').length;
    const absent  = students.filter(s => session[s.id]?.status === 'absent').length;
    const leave   = students.filter(s => session[s.id]?.status === 'leave').length;

    doc.setTextColor(120, 120, 150);
    doc.setFontSize(9);
    doc.text(`Summary — Total: ${students.length}  |  Present: ${present}  |  Late: ${late}  |  Absent: ${absent}  |  Leave: ${leave}`, 20, y);

    doc.save(`attendance_${classId}_${dateStr}.pdf`);
    showToast('ດາວໂຫຼດ PDF ຮຽບຮ້ອຍ', 'success');
}

// =====================================================
// SETUP EVENT LISTENERS
// =====================================================
function setupEventListeners() {
    // Sidebar toggle (mobile)
    document.getElementById('btn-menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Nav items
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Class selector
    document.getElementById('class-selector').addEventListener('change', (e) => {
        state.currentClassId = e.target.value;
        saveState();
        renderAttendanceView();
        if (state.currentView === 'report')   renderReports();
        if (state.currentView === 'students') renderStudentsTable();
        if (state.currentView === 'history')  renderHistory();
    });

    // Date change
    document.getElementById('attendance-date').addEventListener('change', () => {
        renderAttendanceView();
        if (state.currentView === 'report') renderReports();
    });

    // Search & Filter
    document.getElementById('search-student').addEventListener('input', () => {
        const students = getStudentsForClass(state.currentClassId);
        const session  = getSessionData(state.currentClassId, getSelectedDate());
        renderStudentList(students, session);
    });
    document.getElementById('filter-status').addEventListener('change', () => {
        const students = getStudentsForClass(state.currentClassId);
        const session  = getSessionData(state.currentClassId, getSelectedDate());
        renderStudentList(students, session);
    });

    // Mark All Present
    document.getElementById('btn-mark-all-present').addEventListener('click', () => {
        const classId = state.currentClassId;
        const dateStr = getSelectedDate();
        const students = getStudentsForClass(classId);
        const session  = getSessionData(classId, dateStr);
        students.forEach(s => {
            if (!session[s.id] || session[s.id].status === 'none') {
                setSessionEntry(classId, dateStr, s.id, { status: 'present', time: new Date().toISOString() });
            }
        });
        renderAttendanceView();
        showToast('ກວດລາຍຊື່ມາທັງໝົດຮຽບຮ້ອຍ', 'success');
    });

    // Mark All Absent
    document.getElementById('btn-mark-all-absent').addEventListener('click', () => {
        showConfirm(
            'ໝາຍທຸກຄົນເປັນຂາດຮຽນ',
            'ນັກຮຽນທີ່ຍັງບໍ່ໄດ້ກວດລາຍຊື່ຈະຖືກຕັ້ງສະຖານະ "ຂາດຮຽນ" ທັງໝົດ',
            () => {
                const classId  = state.currentClassId;
                const dateStr  = getSelectedDate();
                const students = getStudentsForClass(classId);
                const session  = getSessionData(classId, dateStr);
                students.forEach(s => {
                    if (!session[s.id] || session[s.id].status === 'none') {
                        setSessionEntry(classId, dateStr, s.id, { status: 'absent', time: new Date().toISOString() });
                    }
                });
                renderAttendanceView();
                showToast('ຕັ້ງສະຖານະຂາດຮຽນຮຽບຮ້ອຍ', 'warning');
            }
        );
    });

    // Reset Status
    document.getElementById('btn-reset-status').addEventListener('click', () => {
        showConfirm(
            'ລ້າງການກວດລາຍຊື່',
            `ລ້າງການກວດລາຍຊື່ທັງໝົດວັນທີ ${formatDateTH(getSelectedDate())} ໃຊ່ໄຫມ?`,
            () => {
                const key = getSessionKey(state.currentClassId, getSelectedDate());
                delete state.sessions[key];
                renderAttendanceView();
                showToast('ລ້າງການກວດລາຍຊື່ຮຽບຮ້ອຍ', 'info');
            }
        );
    });

    // Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);

    // Export PDF
    document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);

    // Save Button
    document.getElementById('btn-save').addEventListener('click', () => {
        const classId  = state.currentClassId;
        const dateStr  = getSelectedDate();
        const students = getStudentsForClass(classId);
        const session  = getSessionData(classId, dateStr);
        const unchecked = students.filter(s => !session[s.id] || session[s.id].status === 'none').length;

        const doSave = () => {
            const btn = document.getElementById('btn-save');
            const orig = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ກຳລັງບັນທຶກ...`;
            btn.disabled = true;

            setTimeout(() => {
                saveState();
                btn.innerHTML = orig;
                btn.disabled = false;

                // Update notification badge with unchecked count
                const badge = document.getElementById('notif-badge');
                const currentUnchecked = students.filter(s => !getSessionData(classId, dateStr)[s.id] || getSessionData(classId, dateStr)[s.id].status === 'none').length;
                if (currentUnchecked > 0) {
                    badge.style.display = 'flex';
                    badge.textContent = currentUnchecked;
                } else {
                    badge.style.display = 'none';
                }

                showToast('ບັນທຶກຂໍ້ມູນຮຽບຮ້ອຍແລ້ວ ✓', 'success');
            }, 700);
        };

        if (unchecked > 0) {
            showConfirm(
                'ບັນທຶກຂໍ້ມູນ',
                `ຍັງມີນັກຮຽນ ${unchecked} ຄົນທີ່ຍັງບໍ່ໄດ້ກວດລາຍຊື່ ຕ້ອງການບັນທຶກຢູ່ດີໃຊ່ໄຫມ?`,
                doSave,
                false
            );
        } else {
            doSave();
        }
    });

    // Add Student (from attendance view)
    document.getElementById('btn-add-student').addEventListener('click', () => openStudentModal());

    // Add Student (from students view)
    document.getElementById('btn-add-student-page').addEventListener('click', () => openStudentModal());

    // -- Student Modal --
    const picInput = document.getElementById('new-student-pic');
    picInput.addEventListener('change', () => {
        const file = picInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('avatar-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        };
        reader.readAsDataURL(file);
    });

    const closeStudentModal = () => {
        closeModal('student-modal');
        state.editingStudentKey = null;
    };
    document.getElementById('btn-close-student-modal').addEventListener('click', closeStudentModal);
    document.getElementById('btn-cancel-student-modal').addEventListener('click', closeStudentModal);

    document.getElementById('btn-confirm-student').addEventListener('click', () => {
        const idInput    = document.getElementById('new-student-id').value.trim();
        const nameInput  = document.getElementById('new-student-name').value.trim();
        const genderSel  = document.getElementById('new-student-gender').value;
        const phoneInput = document.getElementById('new-student-phone').value.trim();
        const picFile    = document.getElementById('new-student-pic').files[0];

        if (!idInput || !nameInput) {
            showToast('ກະລຸນາປ້ອນລຳດັບ ແລະ ຊື່-ນາມສະກຸນໃຫ້ຄົບ', 'error');
            return;
        }

        const processStudent = (picUrl) => {
            if (state.editingStudentKey) {
                // Edit mode
                const [editClassId, editStudentId] = state.editingStudentKey.split(/_(.+)/);
                const idx = state.students.findIndex(s => s.id === editStudentId && s.classId === editClassId);
                if (idx !== -1) {
                    state.students[idx] = {
                        ...state.students[idx],
                        id: idInput,
                        name: nameInput,
                        gender: genderSel,
                        phone: phoneInput,
                        profilePic: picFile ? picUrl : state.students[idx].profilePic,
                    };
                }
                showToast(`ແກ້ໄຂຂໍ້ມູນ ${nameInput} ຮຽບຮ້ອຍແລ້ວ!`, 'success');
            } else {
                // Add mode — check duplicate ID in same class
                const classId = state.currentClassId;
                if (state.students.find(s => s.id === idInput && s.classId === classId)) {
                    showToast(`ລຳດັບ ${idInput} ມີຢູ່ແລ້ວໃນຫ້ອງນີ້`, 'error');
                    return;
                }
                state.students.push({
                    id: idInput,
                    name: nameInput,
                    gender: genderSel,
                    phone: phoneInput,
                    profilePic: picUrl || '',
                    classId: classId,
                });
                showToast(`ເພີ່ມ ${nameInput} ຮຽບຮ້ອຍ`, 'success');
            }

            saveState();
            closeStudentModal();
            renderAttendanceView();
            renderStudentsTable();
        };

        if (picFile) {
            const reader = new FileReader();
            reader.onload = (e) => processStudent(e.target.result);
            reader.readAsDataURL(picFile);
        } else {
            processStudent('');
        }
    });

    // Photo Modal
    document.getElementById('btn-close-photo-modal').addEventListener('click', () => closeModal('view-photo-modal'));
    document.getElementById('view-photo-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('view-photo-modal')) closeModal('view-photo-modal');
    });

    // Confirm Modal
    document.getElementById('btn-confirm-cancel').addEventListener('click', () => closeModal('confirm-modal'));
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
        if (typeof confirmCallback === 'function') confirmCallback();
        closeModal('confirm-modal');
        confirmCallback = null;
    });

    // Settings save
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        state.settings.startTime    = document.getElementById('setting-start-time').value;
        state.settings.lateMinutes  = parseInt(document.getElementById('setting-late-mins').value) || 15;
        state.settings.teacherName  = document.getElementById('setting-teacher-name').value.trim();
        state.settings.schoolName   = document.getElementById('setting-school-name').value.trim();
        saveState();
        showToast('ບັນທຶກການຕັ້ງຄ່າຮຽບຮ້ອຍ', 'success');
    });

    // Add class (settings)
    document.getElementById('btn-add-class').addEventListener('click', addNewClass);
    document.getElementById('new-class-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addNewClass();
    });

    // History search
    document.getElementById('btn-history-search').addEventListener('click', renderHistory);

    // Danger zone
    document.getElementById('btn-clear-history').addEventListener('click', () => {
        showConfirm(
            'ລ້າງປະຫວັດທັງໝົດ',
            'ຈະລົບຂໍ້ມູນການກວດລາຍຊື່ທຸກວັນທຸກຫ້ອງຢ່າງຖາວອນ ບໍ່ສາມາດກູ້ຄືນໄດ້',
            () => {
                state.sessions = {};
                saveState();
                renderAttendanceView();
                showToast('ລ້າງປະຫວັດຮຽບຮ້ອຍແລ້ວ', 'warning');
            }
        );
    });

    document.getElementById('btn-reset-all').addEventListener('click', () => {
        showConfirm(
            'ຣີເຊັດຂໍ້ມູນທັງໝົດ',
            'ຈະລົບຂໍ້ມູນທຸກຢ່າງ ແລະ ໂຫຼດຂໍ້ມູນຕົວຢ່າງໃໝ່ທັງໝົດ ບໍ່ສາມາດກູ້ຄືນໄດ້',
            () => {
                localStorage.clear();
                location.reload();
            }
        );
    });

    // Notification button
    document.getElementById('btn-notifications').addEventListener('click', () => {
        showToast('ບໍ່ມີການແຈ້ງເຕືອນໃໝ່', 'info');
    });

    // Close modals on overlay click (general)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && overlay.id !== 'confirm-modal') {
                overlay.classList.remove('show');
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        }
    });
}

function addNewClass() {
    const input = document.getElementById('new-class-name');
    const name  = input.value.trim();
    if (!name) { showToast('ກະລຸນາປ້ອນຊື່ຫ້ອງຮຽນ', 'warning'); return; }
    if (state.classes.find(c => c.name === name)) {
        showToast('ມີຫ້ອງຮຽນນີ້ແລ້ວ', 'warning');
        return;
    }
    const newClass = { id: genId('cls'), name };
    state.classes.push(newClass);
    input.value = '';
    saveState();
    renderClassSelector();
    renderSettingsClassList();
    showToast(`ເພີ່ມຫ້ອງ "${name}" ຮຽບຮ້ອຍ`, 'success');
}

// =====================================================
// INIT
// =====================================================
function initApp() {
    loadState();

    // Set today's date
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) dateInput.value = getTodayStr();

    // Set history date defaults
    const hFrom = document.getElementById('history-date-from');
    const hTo   = document.getElementById('history-date-to');
    if (hFrom) { const d = new Date(); d.setDate(d.getDate() - 30); hFrom.value = d.toISOString().split('T')[0]; }
    if (hTo)   hTo.value = getTodayStr();

    // Populate class selector
    renderClassSelector();

    // Setup UI
    setupEventListeners();

    // Initial render
    setTimeout(() => {
        renderAttendanceView();
    }, 400);
}

document.addEventListener('DOMContentLoaded', initApp);
