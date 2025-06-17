const fs = require('fs').promises;
const path = require('path');

// 노션 API 설정
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_API_URL = 'https://api.notion.com/v1';

// 노션 API 헤더
const headers = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
};

// 메인 함수
async function fetchNotionData() {
    try {
        console.log('노션 데이터베이스에서 포스트를 가져오는 중...');
        
        // 데이터베이스 쿼리
        const posts = await queryDatabase();
        console.log(`${posts.length}개의 포스트를 발견했습니다.`);
        
        // 각 포스트의 상세 내용 가져오기
        const postsWithContent = await Promise.all(
            posts.map(async (post) => {
                const content = await getPageContent(post.id);
                return {
                    ...post,
                    content: content
                };
            })
        );
        
        // 데이터 저장
        await savePostsData(postsWithContent);
        console.log('✅ 포스트 데이터가 성공적으로 저장되었습니다!');
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        process.exit(1);
    }
}

// 데이터베이스 쿼리
async function queryDatabase() {
    const url = `${NOTION_API_URL}/databases/${DATABASE_ID}/query`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            sorts: [
                {
                    property: 'Date',
                    direction: 'descending'
                }
            ]
        })
    });
    
    if (!response.ok) {
        throw new Error(`데이터베이스 쿼리 실패: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.results.map(page => ({
        id: page.id,
        title: getPlainText(page.properties.Title?.title),
        date: page.properties.Date?.date?.start || new Date().toISOString().split('T')[0],
        tags: page.properties.Tags?.multi_select?.map(tag => tag.name) || [],
        published: page.properties.Published?.checkbox || false,
        url: page.url
    }));
}

// 페이지 내용 가져오기
async function getPageContent(pageId) {
    const url = `${NOTION_API_URL}/blocks/${pageId}/children`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: headers
    });
    
    if (!response.ok) {
        console.warn(`페이지 ${pageId} 내용 가져오기 실패: ${response.statusText}`);
        return '';
    }
    
    const data = await response.json();
    
    // 블록들을 텍스트로 변환
    return data.results.map(block => blockToText(block)).join('\n\n');
}

// 노션 블록을 텍스트로 변환
function blockToText(block) {
    const type = block.type;
    
    if (!block[type] || !block[type].rich_text) {
        return '';
    }
    
    const text = getPlainText(block[type].rich_text);
    
    switch (type) {
        case 'paragraph':
            return text;
        case 'heading_1':
            return `# ${text}`;
        case 'heading_2':
            return `## ${text}`;
        case 'heading_3':
            return `### ${text}`;
        case 'bulleted_list_item':
            return `• ${text}`;
        case 'numbered_list_item':
            return `1. ${text}`;
        case 'code':
            return `\`${text}\``;
        case 'quote':
            return `> ${text}`;
        default:
            return text;
    }
}

// 리치 텍스트에서 일반 텍스트 추출
function getPlainText(richText) {
    if (!richText || !Array.isArray(richText)) {
        return '';
    }
    
    return richText.map(text => {
        let content = text.plain_text;
        
        // 서식 적용
        if (text.annotations.bold) {
            content = `**${content}**`;
        }
        if (text.annotations.italic) {
            content = `*${content}*`;
        }
        if (text.annotations.code) {
            content = `\`${content}\``;
        }
        if (text.href) {
            content = `[${content}](${text.href})`;
        }
        
        return content;
    }).join('');
}

// 포스트 데이터 저장
async function savePostsData(posts) {
    // data 디렉토리 생성
    const dataDir = path.join(process.cwd(), 'data');
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
        // 디렉토리가 이미 존재하는 경우 무시
    }
    
    // JSON 파일로 저장
    const postsData = {
        lastUpdated: new Date().toISOString(),
        posts: posts
    };
    
    const filePath = path.join(dataDir, 'posts.json');
    await fs.writeFile(filePath, JSON.stringify(postsData, null, 2), 'utf8');
    
    console.log(`데이터가 ${filePath}에 저장되었습니다.`);
}

// Node.js에서 fetch 사용을 위한 polyfill
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// 스크립트 실행
if (require.main === module) {
    // 환경 변수 확인
    if (!NOTION_API_KEY) {
        console.error('❌ NOTION_API_KEY 환경 변수가 설정되지 않았습니다.');
        process.exit(1);
    }
    
    if (!DATABASE_ID) {
        console.error('❌ NOTION_DATABASE_ID 환경 변수가 설정되지 않았습니다.');
        process.exit(1);
    }
    
    fetchNotionData();
}

module.exports = { fetchNotionData };