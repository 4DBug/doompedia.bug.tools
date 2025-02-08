const articlesContainer = document.getElementById('articles-container');
const loadingIndicator = document.getElementById('loading');
let isLoading = false;
let scrollTimeout;
let currentCategory = 'featured';
let apContinue = '';
let cmContinue = '';

const randomUrl =
  'https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*';

function getFeaturedUrl() {
  const baseUrl =
    'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Featured_articles&cmlimit=10&cmsort=timestamp&cmdir=desc&format=json&origin=*';
  return cmContinue ? `${baseUrl}&cmcontinue=${encodeURIComponent(cmContinue)}` : baseUrl;
}

function getAlphabeticalUrl() {
  const baseUrl =
    'https://en.wikipedia.org/w/api.php?action=query&list=allpages&apnamespace=0&apfilterredir=nonredirects&aplimit=10&format=json&origin=*';
  return apContinue ? `${baseUrl}&apcontinue=${encodeURIComponent(apContinue)}` : baseUrl;
}

const unloadObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const wrapper = entry.target;
      const container = wrapper.querySelector('.article-frame-container');
      const contentDiv = wrapper.querySelector('.article-content');
      if (!entry.isIntersecting && contentDiv.firstChild.tagName === 'IFRAME') {
        const frameHeight = container.dataset.frameHeight;
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.style.height = `${frameHeight}px`;
        placeholder.dataset.pageid = contentDiv.firstChild.src.split('curid=')[1];
        contentDiv.replaceChild(placeholder, contentDiv.firstChild);
      } else if (entry.isIntersecting && contentDiv.firstChild.tagName === 'DIV') {
        const frameHeight = container.dataset.frameHeight;
        const pageid = contentDiv.firstChild.dataset.pageid;
        const iframe = createIframeElement(`https://en.wikipedia.org/?curid=${pageid}`, frameHeight);
        contentDiv.replaceChild(iframe, contentDiv.firstChild);
      }
    });
  },
  {
    rootMargin: '-500px 0px -500px 0px'
  }
);

function createIframeElement(src, height) {
  const iframe = document.createElement('iframe');
  iframe.className = 'article-iframe';
  iframe.src = src;
  iframe.scrolling = 'no';
  iframe.style.height = `${height}px`;
  return iframe;
}

async function fetchArticles() {
  if (isLoading) return;
  isLoading = true;
  showLoading(true);
  let apiEndpoint;
  if (currentCategory === 'random') {
    apiEndpoint = randomUrl;
  } else if (currentCategory === 'alphabetical') {
    apiEndpoint = getAlphabeticalUrl();
  } else {
    apiEndpoint = getFeaturedUrl();
  }
  try {
    const response = await fetch(apiEndpoint);
    const data = await response.json();
    let pages = [];
    if (currentCategory === 'random') {
      pages = data.query.random;
    } else if (currentCategory === 'alphabetical') {
      pages = data.query.allpages;
      if (data.continue) {
        apContinue = data.continue.apcontinue;
      } else {
        apContinue = '';
      }
    } else {
      pages = data.query.categorymembers;
      if (data.continue) {
        cmContinue = data.continue.cmcontinue;
      } else {
        cmContinue = '';
      }
    }
    const fragment = document.createDocumentFragment();
    pages.forEach((page) => {
      const articleFrame = createArticleFrame(page);
      fragment.appendChild(articleFrame);
      unloadObserver.observe(articleFrame);
    });
    articlesContainer.appendChild(fragment);
  } catch (error) {
    console.error(error);
  } finally {
    isLoading = false;
    showLoading(false);
  }
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
  const iframe = createIframeElement(`https://en.wikipedia.org/?curid=${pid}`, frameHeight);
  contentDiv.appendChild(iframe);
  container.appendChild(contentDiv);
  const expandButton = document.createElement('button');
  expandButton.className = 'expand-button';
  expandButton.textContent = 'Expand';
  let expandCount = 0;
  expandButton.addEventListener('click', () => {
    expandCount++;
    const isMobile = window.innerWidth <= 768;
    const baseHeight = isMobile ? window.innerHeight : 600;
    const extraMargin = isMobile ? 245 : 204;
    const newContainerHeight = baseHeight + expandCount * 300;
    container.style.height = `${newContainerHeight}px`;
    const newFrameHeight = newContainerHeight + extraMargin;
    container.dataset.frameHeight = newFrameHeight;
    const frameElement = contentDiv.firstChild;
    if (frameElement) {
      frameElement.style.height = `${newFrameHeight}px`;
    }
    if (expandCount > 1) {
      expandButton.textContent = `Expand (${expandCount}×)`;
    }
  });
  container.appendChild(expandButton);
  wrapper.appendChild(container);
  return wrapper;
}

function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
  } else {
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