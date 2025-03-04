const articlesContainer = document.getElementById('articles-container');
const loadingIndicator = document.getElementById('loading');

let isLoading = false;
let scrollTimeout;
let currentCategory = 'featured';
let apContinue = '';
let cmContinue = '';

const endpoints = {
  random:
    'https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*',
  featured:
    'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Featured_articles&cmlimit=10&cmsort=timestamp&cmdir=desc&format=json&origin=*',
  alphabetical:
    'https://en.wikipedia.org/w/api.php?action=query&list=allpages&apnamespace=0&apfilterredir=nonredirects&aplimit=10&format=json&origin=*'
};

function getApiEndpoint() {
  if (currentCategory === 'random') {
    return endpoints.random;
  } else if (currentCategory === 'alphabetical') {
    return apContinue
      ? endpoints.alphabetical + '&apcontinue=' + encodeURIComponent(apContinue)
      : endpoints.alphabetical;
  } else if (currentCategory === 'featured') {
    return cmContinue
      ? endpoints.featured + '&cmcontinue=' + encodeURIComponent(cmContinue)
      : endpoints.featured;
  }
}

function createIframe(src, height) {
  const iframe = document.createElement('iframe');
  iframe.className = 'article-iframe';
  iframe.src = src;
  iframe.scrolling = 'no';
  iframe.style.height = `${height}px`;
  return iframe;
}

function createArticleFrame(page) {
  const wrapper = document.createElement('div');
  wrapper.className = 'article-wrapper';

  const title = document.createElement('h1');
  title.className = 'article-title';
  title.textContent = page.title;
  wrapper.appendChild(title);

  const container = document.createElement('div');
  container.className = 'article-frame-container';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'article-content';

  const isMobile = window.innerWidth <= 768;
  const baseHeight = isMobile ? window.innerHeight : 600;
  const extraMargin = isMobile ? 245 : 204;
  const frameHeight = baseHeight + extraMargin;
  container.dataset.frameHeight = frameHeight;

  const pid = page.pageid || page.id;
  const iframe = createIframe(`https://en.wikipedia.org/?curid=${pid}`, frameHeight);
  contentDiv.appendChild(iframe);
  container.appendChild(contentDiv);

  const expandButton = document.createElement('button');
  expandButton.className = 'expand-button';
  expandButton.textContent = 'Expand';
  let expandCount = 0;
  expandButton.addEventListener('click', () => {
    expandCount++;
    const newBaseHeight = isMobile ? window.innerHeight : 600;
    const newContainerHeight = newBaseHeight + expandCount * 300;
    container.style.height = `${newContainerHeight}px`;
    const newFrameHeight = newContainerHeight + extraMargin;
    container.dataset.frameHeight = newFrameHeight;

    if (contentDiv.firstChild) {
      contentDiv.firstChild.style.height = `${newFrameHeight}px`;
    }
    expandButton.textContent = expandCount > 1 ? `Expand (${expandCount}×)` : 'Expand';
  });
  container.appendChild(expandButton);
  wrapper.appendChild(container);
  return wrapper;
}


const observerOptions = {
  rootMargin: '0px',
  threshold: 0.1
};

const articleObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const wrapper = entry.target;
    const container = wrapper.querySelector('.article-frame-container');
    const contentDiv = wrapper.querySelector('.article-content');
    
    if (!entry.isIntersecting) {
      if (contentDiv.firstChild && contentDiv.firstChild.tagName === 'IFRAME') {
        const frameHeight = container.dataset.frameHeight;
        const pageid = contentDiv.firstChild.src.split('curid=')[1];
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.style.height = `${frameHeight}px`;
        placeholder.dataset.pageid = pageid;
        contentDiv.replaceChild(placeholder, contentDiv.firstChild);
      }
    } else {
      if (contentDiv.firstChild && contentDiv.firstChild.tagName === 'DIV') {
        const frameHeight = container.dataset.frameHeight;
        const pageid = contentDiv.firstChild.dataset.pageid;
        const iframe = createIframe(`https://en.wikipedia.org/?curid=${pageid}`, frameHeight);
        contentDiv.replaceChild(iframe, contentDiv.firstChild);
      }
    }
  });
}, observerOptions);

async function fetchArticles() {
  if (isLoading) return;
  isLoading = true;
  loadingIndicator.classList.remove('hidden');

  const apiUrl = getApiEndpoint();
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    let pages = [];
    if (currentCategory === 'random') {
      pages = data.query.random;
    } else if (currentCategory === 'alphabetical') {
      pages = data.query.allpages;
      apContinue = data.continue && data.continue.apcontinue ? data.continue.apcontinue : '';
    } else if (currentCategory === 'featured') {
      pages = data.query.categorymembers;
      cmContinue = data.continue && data.continue.cmcontinue ? data.continue.cmcontinue : '';
    }

    const fragment = document.createDocumentFragment();
    pages.forEach((page) => {
      const article = createArticleFrame(page);
      fragment.appendChild(article);
      articleObserver.observe(article);
    });
    articlesContainer.appendChild(fragment);
  } catch (error) {
    console.error('Error fetching articles:', error);
  } finally {
    isLoading = false;
    loadingIndicator.classList.add('hidden');
  }
}

function handleScroll() {
  if (scrollTimeout) return;
  scrollTimeout = requestAnimationFrame(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5000) {
      fetchArticles();
    }
    scrollTimeout = null;
  });
}

function setCategory(category) {
  if (currentCategory === category) return;
  currentCategory = category;
  articlesContainer.innerHTML = '';
  if (category === 'alphabetical') {
    apContinue = '';
  } else if (category === 'featured') {
    cmContinue = '';
  }
  fetchArticles();
}

function init() {
  fetchArticles();
  window.addEventListener('scroll', handleScroll, { passive: true });
  const headerItems = document.querySelectorAll('#category-header li');
  headerItems.forEach((item) => {
    item.addEventListener('click', () => {
      headerItems.forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      setCategory(item.dataset.category);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
