const STORAGE_KEYS = {
  theme: 'okuma-arşivi-theme',
  books: 'okuma-arşivi-books',
  authors: 'okuma-arşivi-authors',
};

const SUPABASE_URL = 'https://ksheklowlglsiccupukl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaGVrbG93bGdsc2ljY3VwdWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTU0NDksImV4cCI6MjEwNTU3MTQ0OX0.Q_bW_JrzsscQaFeXEL06aV2gk6iLbf3ZOvp_J1Ffiso';

const STATUS_LABELS = {
  okundu: 'Okundu',
  okuyor: 'Okuyorum',
  okunacak: 'Okunacak',
};

const SPINE_COLORS = ['#7c3a2d', '#3f5a52', '#4a4066', '#8a6a2f', '#2f4858', '#7a3b4e', '#405c3f', '#6b4a2a', '#3a4a63', '#6a2f3a'];

const state = {
  books: [],
  authors: [],
  view: 'books',
  search: '',
  statusFilter: '',
  theme: 'light',
  selectedBookId: null,
  editingBookId: null,
  editingAuthorId: null,
  bookDraft: {
    title: '',
    author: '',
    year: '',
    genre: '',
    status: 'okundu',
    rating: 0,
    finishedDate: '',
    summary: '',
    thoughts: '',
    quotes: '',
  },
  authorDraft: {
    name: '',
    note: '',
  },
  showBookForm: false,
  showAuthorForm: false,
};

const elements = {
  themeBtn: document.getElementById('themeBtn'),
  themeIco: document.getElementById('themeIco'),
  themeLbl: document.getElementById('themeLbl'),
  tabBooks: document.getElementById('tabBooks'),
  tabAuthors: document.getElementById('tabAuthors'),
  nBooks: document.getElementById('nBooks'),
  nAuthors: document.getElementById('nAuthors'),
  booksView: document.getElementById('booksView'),
  authorsView: document.getElementById('authorsView'),
  search: document.getElementById('search'),
  statusFilter: document.getElementById('statusFilter'),
  addBtn: document.getElementById('addBtn'),
  addLbl: document.getElementById('addLbl'),
  bookGrid: document.getElementById('bookGrid'),
  booksEmpty: document.getElementById('booksEmpty'),
  authorGrid: document.getElementById('authorGrid'),
  authorsEmpty: document.getElementById('authorsEmpty'),
  booksCount: document.getElementById('booksCount'),
  authorsCount: document.getElementById('authorsCount'),
  overlay: document.getElementById('overlay'),
  toast: document.getElementById('toast'),
};

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSpineColor(value = '') {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}

async function loadFromStorage() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    state.theme = savedTheme;
  }

  try {
    const savedBooks = JSON.parse(localStorage.getItem(STORAGE_KEYS.books) || '[]');
    state.books = Array.isArray(savedBooks) ? savedBooks : [];
  } catch {
    state.books = [];
  }

  try {
    const savedAuthors = JSON.parse(localStorage.getItem(STORAGE_KEYS.authors) || '[]');
    state.authors = Array.isArray(savedAuthors) ? savedAuthors : [];
  } catch {
    state.authors = [];
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/archive_data?select=kind,data`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) throw new Error(`Supabase load failed: ${response.status}`);

    const rows = await response.json();
    const remoteBooks = rows.find((row) => row.kind === 'books')?.data;
    const remoteAuthors = rows.find((row) => row.kind === 'authors')?.data;
    if (Array.isArray(remoteBooks)) state.books = remoteBooks;
    if (Array.isArray(remoteAuthors)) state.authors = remoteAuthors;
    localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(state.books));
    localStorage.setItem(STORAGE_KEYS.authors, JSON.stringify(state.authors));
  } catch (error) {
    console.warn('Supabase verilerine erişilemedi; yerel veriler kullanılıyor.', error);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(state.books));
  localStorage.setItem(STORAGE_KEYS.authors, JSON.stringify(state.authors));

  fetch(`${SUPABASE_URL}/rest/v1/archive_data?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      { id: 'books', kind: 'books', data: state.books, updated_at: new Date().toISOString() },
      { id: 'authors', kind: 'authors', data: state.authors, updated_at: new Date().toISOString() },
    ]),
  }).catch((error) => console.warn('Supabase kaydı başarısız.', error));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

function setTheme(nextTheme) {
  state.theme = nextTheme;
  document.documentElement.setAttribute('data-theme', nextTheme);
  elements.themeIco.textContent = nextTheme === 'dark' ? '☀' : '☾';
  elements.themeLbl.textContent = nextTheme === 'dark' ? 'Aydınlık' : 'Karanlık';
  persist();
}

function getFilteredBooks() {
  const query = state.search.trim().toLocaleLowerCase('tr');
  return state.books.filter((book) => {
    if (state.statusFilter && book.status !== state.statusFilter) return false;
    if (!query) return true;
    const haystack = `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase('tr');
    return haystack.includes(query);
  });
}

function getInitials(value) {
  const words = (value || 'A').split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() || '').join('') || 'A';
}

function renderStars(rating) {
  return `
    <span class="stars">
      ${[1, 2, 3, 4, 5].map((star) => `<span class="${star <= rating ? '' : 'off'}">★</span>`).join('')}
    </span>
  `;
}

function renderBookCards() {
  const books = getFilteredBooks();
  elements.nBooks.textContent = `(${state.books.length})`;
  elements.booksCount.textContent = books.length ? `${books.length} kitap` : '';

  if (!state.books.length) {
    elements.bookGrid.innerHTML = '';
    elements.booksEmpty.innerHTML = `
      <div class="empty">
        <div class="ico">📚</div>
        <h3>Arşivin henüz boş</h3>
        <p>İlk kitabını ekleyerek okuma geçmişini başlat.</p>
        <button class="btn-add" type="button" data-open-book-form>İlk Kitabı Ekle</button>
      </div>
    `;
    return;
  }

  if (!books.length) {
    elements.bookGrid.innerHTML = '';
    elements.booksEmpty.innerHTML = `
      <div class="empty">
        <div class="ico">🔍</div>
        <h3>Sonuç yok</h3>
        <p>Aramana veya seçtiğin duruma uyan kitap bulunamadı.</p>
      </div>
    `;
    return;
  }

  elements.booksEmpty.innerHTML = '';
  elements.bookGrid.innerHTML = books
    .map((book) => {
      const statusClass = book.status === 'okundu' ? 'st-okundu' : book.status === 'okuyor' ? 'st-okuyor' : 'st-okunacak';
      const status = STATUS_LABELS[book.status] || 'Okunacak';
      const title = escapeHtml(book.title || 'İsimsiz');
      const author = escapeHtml(book.author || '');
      const genre = escapeHtml((book.genre || 'Kitap').split(',')[0].trim() || 'Kitap');
      const starHtml = book.status === 'okundu' && book.rating > 0 ? renderStars(book.rating) : '';

      return `
        <button class="book" type="button" data-book-id="${book.id}">
          <div class="cover-wrap" style="background:${getSpineColor(book.title || book.author)}">
            <div class="spine">
              <div class="s-top">${genre}</div>
              <div>
                <div class="s-title">${title}</div>
                ${book.author ? `<div class="s-auth">${author}</div>` : ''}
              </div>
            </div>
            <span class="status-dot ${statusClass}">${status}</span>
          </div>
          <div class="book-meta">
            <span class="bt">${title}</span>
            ${book.author ? `<span class="ba">${author}</span>` : ''}
            ${starHtml}
          </div>
        </button>
      `;
    })
    .join('');
}

function renderAuthorCards() {
  const authors = state.authors.map((author) => ({
    ...author,
    count: state.books.filter((book) => (book.author || '').toLocaleLowerCase('tr') === (author.name || '').toLocaleLowerCase('tr')).length,
  }));

  elements.nAuthors.textContent = `(${state.authors.length})`;
  elements.authorsCount.textContent = authors.length ? `${authors.length} yazar` : '';

  if (!state.authors.length) {
    elements.authorGrid.innerHTML = '';
    elements.authorsEmpty.innerHTML = `
      <div class="empty">
        <div class="ico">🖋️</div>
        <h3>Henüz yazar yok</h3>
        <p>Sevdiğin yazarları ekleyerek okuma arşivini daha düzenli hale getirebilirsin.</p>
        <button class="btn-add" type="button" data-open-author-form>Yazar Ekle</button>
      </div>
    `;
    return;
  }

  elements.authorsEmpty.innerHTML = '';
  elements.authorGrid.innerHTML = authors
    .map((author) => `
      <button class="author-card" type="button" data-author-id="${author.id}">
        <div class="aphoto aphoto-ph">${escapeHtml(getInitials(author.name))}</div>
        <div style="min-width:0">
          <div class="an">${escapeHtml(author.name || 'İsimsiz')}</div>
          <div class="ac">${author.count ? `${author.count} kitap arşivde` : 'Arşivde kitabı yok'}</div>
          ${author.note ? `<div class="anote">${escapeHtml(author.note)}</div>` : ''}
        </div>
      </button>
    `)
    .join('');
}

function setView(nextView) {
  state.view = nextView;
  elements.tabBooks.classList.toggle('active', nextView === 'books');
  elements.tabAuthors.classList.toggle('active', nextView === 'authors');
  elements.tabBooks.setAttribute('aria-selected', String(nextView === 'books'));
  elements.tabAuthors.setAttribute('aria-selected', String(nextView === 'authors'));
  elements.booksView.hidden = nextView !== 'books';
  elements.authorsView.hidden = nextView !== 'authors';
  elements.search.closest('.search').style.display = nextView === 'books' ? '' : 'none';
  elements.statusFilter.style.display = nextView === 'books' ? '' : 'none';
  elements.addLbl.textContent = nextView === 'books' ? 'Kitap Ekle' : 'Yazar Ekle';
}

function openBookForm(book = null) {
  state.showBookForm = true;
  state.editingBookId = book ? book.id : null;
  state.bookDraft = book ? { ...book } : {
    title: '',
    author: '',
    year: '',
    genre: '',
    status: 'okundu',
    rating: 0,
    finishedDate: '',
    summary: '',
    thoughts: '',
    quotes: '',
  };
  renderBookForm();
}

function closeBookForm() {
  state.showBookForm = false;
  state.editingBookId = null;
  state.bookDraft = { title: '', author: '', year: '', genre: '', status: 'okundu', rating: 0, finishedDate: '', summary: '', thoughts: '', quotes: '' };
  elements.overlay.hidden = true;
  elements.overlay.innerHTML = '';
}

function renderBookForm() {
  const title = state.editingBookId ? 'Kitabı Düzenle' : 'Yeni Kitap';
  const submitText = state.editingBookId ? 'Değişiklikleri Kaydet' : 'Arşive Ekle';

  elements.overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-head">
        <h2>${title}</h2>
        <button type="button" class="x" data-close-book-form aria-label="Kapat">×</button>
      </div>
      <form id="bookForm">
        <div class="field">
          <label>Kitap adı *</label>
          <input type="text" value="${escapeHtml(state.bookDraft.title)}" id="bookTitle" required maxlength="200" />
        </div>
        <div class="row2">
          <div class="field">
            <label>Yazar</label>
            <input type="text" value="${escapeHtml(state.bookDraft.author)}" list="authorList" id="bookAuthor" maxlength="120" />
          </div>
          <div class="field">
            <label>Yıl</label>
            <input type="text" value="${escapeHtml(state.bookDraft.year)}" id="bookYear" maxlength="12" />
          </div>
        </div>
        <div class="field">
          <label>Tür / Etiketler</label>
          <input type="text" value="${escapeHtml(state.bookDraft.genre)}" id="bookGenre" placeholder="Roman, Klasik, Distopya" maxlength="120" />
        </div>
        <div class="field">
          <label>Durum</label>
          <div class="status-pick">
            ${['okundu', 'okuyor', 'okunacak'].map((status) => `
              <label>
                <input type="radio" name="book-status" value="${status}" ${state.bookDraft.status === status ? 'checked' : ''}>
                <span>${STATUS_LABELS[status]}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <label>Puanın</label>
            <div class="rate">
              ${[1, 2, 3, 4, 5].map((star) => `
                <button type="button" class="${star <= state.bookDraft.rating ? 'on' : ''}" data-rate="${star}">★</button>
              `).join('')}
            </div>
          </div>
          <div class="field">
            <label>Bitirme tarihi</label>
            <input type="text" value="${escapeHtml(state.bookDraft.finishedDate)}" id="bookDate" placeholder="Örn. Mart 2026" maxlength="40" />
          </div>
        </div>
        <div class="field">
          <label>Özet</label>
          <textarea id="bookSummary" maxlength="4000" placeholder="Kitap ne anlatıyordu? Ana fikir, olay örgüsü…">${escapeHtml(state.bookDraft.summary)}</textarea>
        </div>
        <div class="field">
          <label>Düşüncelerim</label>
          <textarea id="bookThoughts" maxlength="4000" placeholder="Sana ne hissettirdi? Neyi sevdin, neyi sevmedin?">${escapeHtml(state.bookDraft.thoughts)}</textarea>
        </div>
        <div class="field">
          <label>Alıntılar</label>
          <textarea id="bookQuotes" maxlength="4000" placeholder="Unutmak istemediğin satırlar…">${escapeHtml(state.bookDraft.quotes)}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-ghost" data-close-book-form>Vazgeç</button>
          <button type="submit" class="btn-primary">${submitText}</button>
        </div>
      </form>
    </div>
    <datalist id="authorList">
      ${state.authors.map((author) => `<option value="${escapeHtml(author.name)}"></option>`).join('')}
    </datalist>
  `;

  elements.overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  document.querySelector('[data-close-book-form]').addEventListener('click', closeBookForm);
  document.getElementById('bookForm').addEventListener('submit', handleBookSubmit);

  document.querySelectorAll('[name="book-status"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.bookDraft.status = input.value;
      document.querySelectorAll('[data-rate]').forEach((button) => {
        button.classList.toggle('on', Number(button.dataset.rate) <= state.bookDraft.rating);
      });
    });
  });

  document.querySelectorAll('[data-rate]').forEach((button) => {
    button.addEventListener('click', () => {
      const rate = Number(button.dataset.rate);
      state.bookDraft.rating = state.bookDraft.rating === rate ? 0 : rate;
      document.querySelectorAll('[data-rate]').forEach((item) => {
        item.classList.toggle('on', Number(item.dataset.rate) <= state.bookDraft.rating);
      });
    });
  });

  const titleInput = document.getElementById('bookTitle');
  const authorInput = document.getElementById('bookAuthor');
  const yearInput = document.getElementById('bookYear');
  const genreInput = document.getElementById('bookGenre');
  const dateInput = document.getElementById('bookDate');
  const summaryInput = document.getElementById('bookSummary');
  const thoughtsInput = document.getElementById('bookThoughts');
  const quotesInput = document.getElementById('bookQuotes');

  titleInput.addEventListener('input', (event) => { state.bookDraft.title = event.target.value; });
  authorInput.addEventListener('input', (event) => { state.bookDraft.author = event.target.value; });
  yearInput.addEventListener('input', (event) => { state.bookDraft.year = event.target.value; });
  genreInput.addEventListener('input', (event) => { state.bookDraft.genre = event.target.value; });
  dateInput.addEventListener('input', (event) => { state.bookDraft.finishedDate = event.target.value; });
  summaryInput.addEventListener('input', (event) => { state.bookDraft.summary = event.target.value; });
  thoughtsInput.addEventListener('input', (event) => { state.bookDraft.thoughts = event.target.value; });
  quotesInput.addEventListener('input', (event) => { state.bookDraft.quotes = event.target.value; });
}

function handleBookSubmit(event) {
  event.preventDefault();
  const title = state.bookDraft.title.trim();
  if (!title) {
    document.getElementById('bookTitle')?.focus();
    return;
  }

  const nextBook = {
    id: state.editingBookId || randomId(),
    title: title || 'İsimsiz',
    author: state.bookDraft.author.trim(),
    year: state.bookDraft.year.trim(),
    genre: state.bookDraft.genre.trim(),
    status: state.bookDraft.status,
    rating: state.bookDraft.status === 'okundu' ? state.bookDraft.rating : 0,
    finishedDate: state.bookDraft.finishedDate.trim(),
    summary: state.bookDraft.summary.trim(),
    thoughts: state.bookDraft.thoughts.trim(),
    quotes: state.bookDraft.quotes.trim(),
    addedAt: state.editingBookId ? (state.books.find((book) => book.id === state.editingBookId)?.addedAt || Date.now()) : Date.now(),
  };

  if (state.editingBookId) {
    state.books = state.books.map((book) => (book.id === state.editingBookId ? nextBook : book));
  } else {
    state.books = [nextBook, ...state.books];
  }

  if (nextBook.author.trim()) {
    const exists = state.authors.some((author) => author.name.toLocaleLowerCase('tr') === nextBook.author.trim().toLocaleLowerCase('tr'));
    if (!exists) {
      state.authors = [{ id: randomId(), name: nextBook.author.trim(), note: '', addedAt: Date.now() }, ...state.authors];
    }
  }

  persist();
  renderAll();
  closeBookForm();
  showToast(state.editingBookId ? 'Değişiklikler kaydedildi.' : 'Kitap arşive eklendi.');
}

function openAuthorForm(author = null) {
  state.showAuthorForm = true;
  state.editingAuthorId = author ? author.id : null;
  state.authorDraft = author ? { name: author.name, note: author.note } : { name: '', note: '' };
  renderAuthorForm();
}

function closeAuthorForm() {
  state.showAuthorForm = false;
  state.editingAuthorId = null;
  state.authorDraft = { name: '', note: '' };
  elements.overlay.hidden = true;
  elements.overlay.innerHTML = '';
  document.body.style.overflow = '';
}

function renderAuthorForm() {
  const title = state.editingAuthorId ? 'Yazarı Düzenle' : 'Yeni Yazar';
  const submitText = state.editingAuthorId ? 'Kaydet' : 'Yazar Ekle';

  elements.overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-head">
        <h2>${title}</h2>
        <button type="button" class="x" data-close-author-form aria-label="Kapat">×</button>
      </div>
      <form id="authorForm">
        <div class="field">
          <label>Ad *</label>
          <input type="text" value="${escapeHtml(state.authorDraft.name)}" id="authorName" required maxlength="120" />
        </div>
        <div class="field">
          <label>Notların</label>
          <textarea id="authorNote" maxlength="3000" placeholder="Bu yazar hakkında ne düşünüyorsun?">${escapeHtml(state.authorDraft.note)}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-ghost" data-close-author-form>Vazgeç</button>
          <button type="submit" class="btn-primary">${submitText}</button>
        </div>
      </form>
    </div>
  `;

  elements.overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  document.querySelector('[data-close-author-form]').addEventListener('click', closeAuthorForm);
  document.getElementById('authorForm').addEventListener('submit', handleAuthorSubmit);

  document.getElementById('authorName').addEventListener('input', (event) => { state.authorDraft.name = event.target.value; });
  document.getElementById('authorNote').addEventListener('input', (event) => { state.authorDraft.note = event.target.value; });
}

function handleAuthorSubmit(event) {
  event.preventDefault();
  const name = state.authorDraft.name.trim();
  if (!name) {
    document.getElementById('authorName')?.focus();
    return;
  }

  const nextAuthor = {
    id: state.editingAuthorId || randomId(),
    name,
    note: state.authorDraft.note.trim(),
    addedAt: state.editingAuthorId ? (state.authors.find((author) => author.id === state.editingAuthorId)?.addedAt || Date.now()) : Date.now(),
  };

  if (state.editingAuthorId) {
    state.authors = state.authors.map((author) => (author.id === state.editingAuthorId ? nextAuthor : author));
  } else {
    state.authors = [...state.authors, nextAuthor];
  }

  state.authors.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  persist();
  renderAll();
  closeAuthorForm();
  showToast(state.editingAuthorId ? 'Yazar kaydedildi.' : 'Yazar eklendi.');
}

function openDetail(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) return;

  const cover = `
    <div class="d-cover" style="background:${getSpineColor(book.title || book.author)}">
      <div class="spine">
        <div class="s-top">${escapeHtml((book.genre || 'Kitap').split(',')[0].trim() || 'Kitap')}</div>
        <div>
          <div class="s-title">${escapeHtml(book.title || 'İsimsiz')}</div>
          ${book.author ? `<div class="s-auth">${escapeHtml(book.author)}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  const badges = [
    `<span class="badge b-status ${book.status === 'okundu' ? 'ok' : book.status === 'okuyor' ? 'reading' : 'later'}">${STATUS_LABELS[book.status]}</span>`,
    ...book.genre.split(',').filter(Boolean).map((genre) => `<span class="badge">${escapeHtml(genre.trim())}</span>`),
    ...(book.finishedDate ? [`<span class="badge">${escapeHtml(book.finishedDate)}</span>`] : []),
  ].join('');

  const blocks = [];
  if (book.summary) blocks.push(`<div class="d-block"><h3>Özet</h3><div class="txt">${escapeHtml(book.summary)}</div></div>`);
  if (book.thoughts) blocks.push(`<div class="d-block"><h3>Düşüncelerim</h3><div class="txt">${escapeHtml(book.thoughts)}</div></div>`);
  if (book.quotes) blocks.push(`<div class="d-block quotes"><h3>Alıntılar</h3><div class="txt">${escapeHtml(book.quotes)}</div></div>`);
  if (!book.summary && !book.thoughts && !book.quotes) {
    blocks.push('<div class="d-block"><p class="d-empty-note">Bu kitap için henüz not eklenmemiş.</p></div>');
  }

  elements.overlay.innerHTML = `
    <div class="sheet detail">
      <div class="sheet-head">
        <h2>Kitap</h2>
        <button type="button" class="x" data-close-detail aria-label="Kapat">×</button>
      </div>
      <div class="detail-body">
        <div class="d-hero">
          ${cover}
          <div class="d-info">
            <h2>${escapeHtml(book.title || 'İsimsiz')}</h2>
            ${book.author ? `<div class="d-auth">${escapeHtml(book.author)}${book.year ? ` · ${escapeHtml(book.year)}` : ''}</div>` : ''}
            <div class="d-badges">${badges}</div>
            ${book.status === 'okundu' && book.rating > 0 ? `<div class="d-stars">${renderStars(book.rating)}</div>` : ''}
          </div>
        </div>
        <div class="d-sections">${blocks.join('')}</div>
        <div class="d-foot">
          <span class="added">Arşive eklendi · ${new Date(book.addedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <div class="d-foot-btns">
            <button type="button" class="btn-danger" data-delete-book="${book.id}">Sil</button>
            <button type="button" class="btn-primary" data-edit-book="${book.id}">Düzenle</button>
          </div>
        </div>
      </div>
    </div>
  `;

  elements.overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  document.querySelector('[data-close-detail]').addEventListener('click', () => {
    elements.overlay.hidden = true;
    elements.overlay.innerHTML = '';
    document.body.style.overflow = '';
  });

  document.querySelector('[data-delete-book]').addEventListener('click', () => {
    if (!window.confirm('Bu kitabı arşivden silmek istiyor musunuz?')) return;
    state.books = state.books.filter((item) => item.id !== book.id);
    persist();
    renderAll();
    elements.overlay.hidden = true;
    elements.overlay.innerHTML = '';
    document.body.style.overflow = '';
    showToast('Kitap silindi.');
  });

  document.querySelector('[data-edit-book]').addEventListener('click', () => {
    elements.overlay.hidden = true;
    elements.overlay.innerHTML = '';
    document.body.style.overflow = '';
    openBookForm(book);
  });
}

function renderAll() {
  renderBookCards();
  renderAuthorCards();
  elements.nBooks.textContent = `(${state.books.length})`;
  elements.nAuthors.textContent = `(${state.authors.length})`;
}

function initEvents() {
  elements.themeBtn.addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  elements.tabBooks.addEventListener('click', () => setView('books'));
  elements.tabAuthors.addEventListener('click', () => setView('authors'));

  elements.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderBookCards();
  });

  elements.statusFilter.addEventListener('change', (event) => {
    state.statusFilter = event.target.value;
    renderBookCards();
  });

  elements.addBtn.addEventListener('click', () => {
    if (state.view === 'books') openBookForm();
    else openAuthorForm();
  });

  document.addEventListener('click', (event) => {
    const bookButton = event.target.closest('[data-book-id]');
    if (bookButton) {
      openDetail(bookButton.dataset.bookId);
      return;
    }

    const authorButton = event.target.closest('[data-author-id]');
    if (authorButton) {
      const author = state.authors.find((item) => item.id === authorButton.dataset.authorId);
      if (author) openAuthorForm(author);
      return;
    }

    const openBookBtn = event.target.closest('[data-open-book-form]');
    if (openBookBtn) {
      openBookForm();
      return;
    }

    const openAuthorBtn = event.target.closest('[data-open-author-form]');
    if (openAuthorBtn) {
      openAuthorForm();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.overlay.hidden) {
      closeBookForm();
      closeAuthorForm();
      elements.overlay.hidden = true;
      elements.overlay.innerHTML = '';
      document.body.style.overflow = '';
    }
  });
}

async function init() {
  await loadFromStorage();
  setTheme(state.theme);
  setView('books');
  renderAll();
  initEvents();
}

init();
