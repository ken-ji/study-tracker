import { getSubjects, saveSubject, deleteSubject } from '../storage.js';

const PRESET_COLORS = [
  '#4A90E2',
  '#E24A4A',
  '#4AAE6A',
  '#E2854A',
  '#9B4AE2',
  '#4AC9C9',
  '#E24AAA',
  '#6B7280',
];

export function render() {
  const section = document.getElementById('subjects');
  section.innerHTML = buildPage(getSubjects());
  attachEvents(section);
}

function buildColorPicker(selectedColor) {
  const swatches = PRESET_COLORS.map(color => {
    const sel = color === selectedColor;
    return `<button type="button" class="color-swatch${sel ? ' selected' : ''}" data-color="${color}" style="background-color:${color}" aria-label="${color}" aria-pressed="${sel}"></button>`;
  }).join('');
  return `<div class="color-picker" role="group" aria-label="カラー選択">${swatches}</div><input type="hidden" class="color-input" value="${selectedColor}">`;
}

function buildSubjectCard(subject) {
  return `<div class="subject-card" data-id="${subject.id}">
  <span class="subject-color" style="background-color:${subject.color}"></span>
  <span class="subject-name">${escapeHtml(subject.name)}</span>
  <div class="subject-actions">
    <button type="button" class="btn-secondary btn-edit" data-id="${subject.id}">編集</button>
    <button type="button" class="btn-danger btn-delete" data-id="${subject.id}">削除</button>
  </div>
</div>`;
}

function buildEditForm(subject) {
  return `<div class="subject-edit-form" data-id="${subject.id}">
  <input type="text" class="subject-name-input" value="${escapeHtml(subject.name)}" maxlength="20" placeholder="科目名（20文字以内）">
  <p class="form-error" aria-live="polite"></p>
  ${buildColorPicker(subject.color)}
  <div class="edit-btn-row">
    <button type="button" class="btn-primary btn-save" data-id="${subject.id}">保存</button>
    <button type="button" class="btn-secondary btn-cancel">キャンセル</button>
  </div>
</div>`;
}

function buildPage(subjects) {
  const listHtml = subjects.length === 0
    ? `<p class="subjects-empty">科目がまだ登録されていません</p>`
    : subjects.map(buildSubjectCard).join('');

  return `<h1 class="page-title">科目管理</h1>
<section class="subjects-add-section">
  <h2 class="section-heading">科目を追加</h2>
  <div class="subjects-add-form">
    <input type="text" id="add-subject-name" class="subject-name-input" placeholder="科目名（20文字以内）" maxlength="20">
    <p class="form-error" aria-live="polite"></p>
    ${buildColorPicker(PRESET_COLORS[0])}
    <button type="button" id="btn-add-subject" class="btn-primary">追加</button>
  </div>
</section>
<section class="subjects-list-section">
  <h2 class="section-heading">登録済み科目</h2>
  <div class="subjects-list">${listHtml}</div>
</section>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attachEvents(section) {
  section.querySelector('.subjects-add-form').addEventListener('click', e => {
    const swatch = e.target.closest('.color-swatch');
    if (swatch) updateColorPicker(swatch);
  });

  section.querySelector('#btn-add-subject').addEventListener('click', () => {
    const form = section.querySelector('.subjects-add-form');
    const nameInput = form.querySelector('#add-subject-name');
    const errorEl = form.querySelector('.form-error');
    const name = nameInput.value.trim();
    const error = validateName(name);
    if (error) {
      errorEl.textContent = error;
      nameInput.focus();
      return;
    }
    errorEl.textContent = '';
    const color = form.querySelector('.color-input').value;
    try {
      saveSubject({ id: crypto.randomUUID(), name, color, createdAt: new Date().toISOString() });
    } catch {
      errorEl.textContent = 'ストレージへの保存に失敗しました';
      return;
    }
    render();
  });

  section.querySelector('.subjects-list').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    const saveBtn = e.target.closest('.btn-save');
    const cancelBtn = e.target.closest('.btn-cancel');
    const swatch = e.target.closest('.color-swatch');

    if (editBtn) handleEdit(section, editBtn.dataset.id);
    else if (deleteBtn) handleDelete(section, deleteBtn.dataset.id);
    else if (saveBtn) handleSave(section, saveBtn.dataset.id);
    else if (cancelBtn) render();
    else if (swatch) updateColorPicker(swatch);
  });
}

function updateColorPicker(selectedSwatch) {
  const picker = selectedSwatch.closest('.color-picker');
  picker.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.remove('selected');
    s.setAttribute('aria-pressed', 'false');
  });
  selectedSwatch.classList.add('selected');
  selectedSwatch.setAttribute('aria-pressed', 'true');
  picker.nextElementSibling.value = selectedSwatch.dataset.color;
}

function validateName(name) {
  if (!name) return '科目名を入力してください';
  if (name.length > 20) return '科目名は20文字以内にしてください';
  return '';
}

function handleEdit(section, id) {
  const subject = getSubjects().find(s => s.id === id);
  if (!subject) return;
  const card = section.querySelector(`.subject-card[data-id="${id}"]`);
  if (!card) return;
  card.insertAdjacentHTML('beforebegin', buildEditForm(subject));
  card.remove();
}

function handleDelete(section, id) {
  const subject = getSubjects().find(s => s.id === id);
  if (!subject) return;
  if (!window.confirm(`「${subject.name}」を削除しますか？\nこの科目に紐づいた学習記録は残ります。`)) return;
  try {
    deleteSubject(id);
  } catch {
    console.error('[subjects] deleteSubject failed');
    return;
  }
  render();
}

function handleSave(section, id) {
  const editForm = section.querySelector(`.subject-edit-form[data-id="${id}"]`);
  if (!editForm) return;
  const nameInput = editForm.querySelector('.subject-name-input');
  const errorEl = editForm.querySelector('.form-error');
  const name = nameInput.value.trim();
  const error = validateName(name);
  if (error) {
    errorEl.textContent = error;
    nameInput.focus();
    return;
  }
  errorEl.textContent = '';
  const color = editForm.querySelector('.color-input').value;
  const subject = getSubjects().find(s => s.id === id);
  if (!subject) return;
  try {
    saveSubject({ ...subject, name, color });
  } catch {
    errorEl.textContent = 'ストレージへの保存に失敗しました';
    return;
  }
  render();
}
