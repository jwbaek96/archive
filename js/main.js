// 전역 변수
let postsData = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 현재 페이지가 메인 페이지인지 확인
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadPosts();
    }
});

// 포스트 목록 불러오기
async function loadPosts() {
    try {
        showLoading();
        
        // 경로 수정: 상대 경로 통일
        const response = await fetch('data/posts.json');
        
        if (!response.ok) {
            throw new Error('포스트 데이터를 불러올 수 없습니다.');
        }
        
        const data = await response.json();
        
        // 📊 전체 JSON 데이터 콘솔에 출력
        console.log('=== 전체 posts.json 데이터 ===');
        console.log(JSON.stringify(data, null, 2));
        
        // 🔧 JSON 구조에 따라 다르게 처리
        postsData = Array.isArray(data) ? data : (data.posts || []);
        
        console.log('=== 포스트 배열 확인 ===');
        console.log('포스트 개수:', postsData.length);
        console.log('포스트 데이터:', postsData);
        
        // 각 포스트의 published 값 상세 확인
        console.log('=== 각 포스트 published 값 확인 ===');
        postsData.forEach((post, index) => {
            console.log(`포스트 ${index + 1}:`);
            console.log(`  제목: "${post.title}"`);
            console.log(`  published 값: ${post.published}`);
            console.log(`  published 타입: ${typeof post.published}`);
            console.log(`  === true 비교: ${post.published === true}`);
            console.log(`  == true 비교: ${post.published == true}`);
            console.log('---');
        });
        
        // 공개된 포스트만 필터링하고 날짜순으로 정렬
        const publishedPosts = postsData
            .filter(post => {
                // 여러 조건으로 published 체크 (더 관대하게)
                const isPublished = 
                    post.published === true ||     // 정확히 true
                    post.published === "true" ||   // 문자열 "true"
                    post.published === 1;          // 숫자 1
                
                console.log(`필터링: "${post.title}"`);
                console.log(`  원본값: ${post.published} (${typeof post.published})`);
                console.log(`  결과: ${isPublished}`);
                
                return isPublished;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('=== 최종 필터링 결과 ===');
        console.log('필터링된 포스트 개수:', publishedPosts.length);
        console.log('필터링된 포스트:', publishedPosts);
        
        // 🚨 임시: 필터링 결과가 0개면 모든 포스트 표시
        let finalPosts = publishedPosts;
        if (publishedPosts.length === 0 && postsData.length > 0) {
            console.log('⚠️ 필터링된 포스트가 없어서 모든 포스트를 표시합니다.');
            finalPosts = postsData.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        if (finalPosts.length === 0) {
            showMessage('아직 공개된 포스트가 없습니다.');
            return;
        }
        
        displayPosts(finalPosts);
        hideLoading();
        
    } catch (error) {
        console.error('포스트 로딩 오류:', error);
        showError();
    }
}

// 포스트 목록 화면에 표시
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = '';
    
    posts.forEach((post, index) => {
        const postElement = createPostCard(post, index);
        container.appendChild(postElement);
    });
    
    container.style.display = 'grid';
}

// 포스트 카드 생성
function createPostCard(post, index) {
    const card = document.createElement('a');
    card.href = utils.createPostUrl(post.id);
    card.className = 'post-card';
    
    // 태그 HTML 생성
    const tagsHtml = post.tags && post.tags.length > 0 
        ? post.tags.map((tag, tagIndex) => 
            `<span class="tag" style="background-color: ${utils.getTagColor(tagIndex)}">${tag}</span>`
          ).join('')
        : '';
    
    card.innerHTML = `
        <h2>${post.title}</h2>
        <div class="post-preview">${utils.getPreview(post.content)}</div>
        <div class="post-meta">
            <span>${utils.formatDate(post.date)}</span>
            <div class="tags">${tagsHtml}</div>
        </div>
    `;
    
    return card;
}

// 개별 포스트 불러오기
async function loadPost(postId) {
    try {
        showLoading();
        
        const response = await fetch('data/posts.json');
        if (!response.ok) {
            throw new Error('포스트 데이터를 불러올 수 없습니다.');
        }
        
        const data = await response.json();
        const post = data.posts.find(p => p.id === postId);
        
        if (!post) {
            throw new Error('포스트를 찾을 수 없습니다.');
        }
        
        // Published 체크를 더 관대하게 (임시)
        if (post.published !== true) {
            console.log(`포스트 "${post.title}"의 published 값:`, post.published);
            // throw new Error('공개되지 않은 포스트입니다.');
        }
        
        displayPost(post);
        hideLoading();
        
    } catch (error) {
        console.error('포스트 로딩 오류:', error);
        showError();
    }
}

// 개별 포스트 표시
function displayPost(post) {
    // 페이지 제목 설정
    document.title = `${post.title} - ${CONFIG.BLOG_TITLE}`;
    document.getElementById('post-title').textContent = post.title;
    
    // 포스트 내용 표시
    document.getElementById('post-title-main').textContent = post.title;
    document.getElementById('post-date').textContent = utils.formatDate(post.date);
    
    // 태그 표시
    const tagsContainer = document.getElementById('post-tags');
    if (post.tags && post.tags.length > 0) {
        tagsContainer.innerHTML = post.tags.map((tag, index) => 
            `<span class="tag" style="background-color: ${utils.getTagColor(index)}">${tag}</span>`
        ).join('');
    }
    
    // 포스트 본문 표시 (마크다운을 HTML로 변환)
    const postBody = document.getElementById('post-body');
    postBody.innerHTML = formatContent(post.content);
    
    // 포스트 표시
    document.getElementById('post-content').style.display = 'block';
}

// 콘텐츠 포맷팅 (간단한 마크다운 지원)
function formatContent(content) {
    if (!content) return '';
    
    let html = content;
    
    // 줄바꿈을 <br>로 변환
    html = html.replace(/\n/g, '<br>');
    
    // **볼드** 텍스트
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // *이탤릭* 텍스트
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // `코드` 텍스트
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // 링크 [텍스트](URL)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 헤딩 ## 텍스트
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    
    // 단락 구분
    html = html.replace(/(<br>\s*){2,}/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // 빈 단락 제거
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    return html;
}

// 로딩 표시
function showLoading() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('posts-container');
    const postContent = document.getElementById('post-content');
    const error = document.getElementById('error');
    
    if (loading) loading.style.display = 'block';
    if (container) container.style.display = 'none';
    if (postContent) postContent.style.display = 'none';
    if (error) error.style.display = 'none';
}

// 로딩 숨기기
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// 에러 표시
function showError() {
    hideLoading();
    const error = document.getElementById('error');
    if (error) error.style.display = 'block';
}

// 메시지 표시
function showMessage(message) {
    hideLoading();
    const container = document.getElementById('posts-container');
    if (container) {
        container.innerHTML = `<div class="message">${message}</div>`;
        container.style.display = 'block';
    }
}

// 검색 기능 (추후 확장 가능)
function searchPosts(query) {
    if (!query) {
        displayPosts(postsData.filter(post => post.published === true));
        return;
    }
    
    const filteredPosts = postsData.filter(post => 
        post.published === true && (
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.content.toLowerCase().includes(query.toLowerCase()) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
        )
    );
    
    displayPosts(filteredPosts);
}