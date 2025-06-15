// 블로그 설정
const CONFIG = {
    // 블로그 제목 및 설명
    BLOG_TITLE: '내 노션 블로그',
    BLOG_DESCRIPTION: '노션으로 관리하는 개인 블로그',
    
    // 포스트 미리보기 텍스트 길이
    PREVIEW_LENGTH: 150,
    
    // 날짜 형식 설정
    DATE_FORMAT: {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    },
    
    // 기본 태그 색상들
    TAG_COLORS: [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
    ]
};

// 유틸리티 함수들
const utils = {
    // 날짜 포맷팅
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', CONFIG.DATE_FORMAT);
    },
    
    // 텍스트 미리보기 생성
    getPreview: (text, length = CONFIG.PREVIEW_LENGTH) => {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    },
    
    // 태그 색상 가져오기
    getTagColor: (index) => {
        return CONFIG.TAG_COLORS[index % CONFIG.TAG_COLORS.length];
    },
    
    // URL 파라미터 생성
    createPostUrl: (postId) => {
        return `post.html?id=${postId}`;
    }
};