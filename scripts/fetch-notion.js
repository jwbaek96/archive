const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Notion 클라이언트 초기화
const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

// 노션 데이터베이스 ID
const databaseId = process.env.NOTION_DATABASE_ID;

async function fetchNotionData() {
    try {
        console.log('Fetching data from Notion...');
        console.log('Database ID:', databaseId);
        console.log('API Key exists:', !!process.env.NOTION_API_KEY);
        
        // 노션 데이터베이스에서 데이터 가져오기
        const response = await notion.databases.query({
            database_id: databaseId,
            // Published 필터 제거 - 모든 포스트 가져오기
            sorts: [
                {
                    property: 'date',
                    direction: 'descending'
                }
            ]
        });

        console.log('Raw response from Notion:', JSON.stringify(response, null, 2));
        
        // 첫 번째 페이지의 속성들을 자세히 확인
        if (response.results.length > 0) {
            console.log('=== 모든 속성 이름과 값 확인 ===');
            Object.entries(response.results[0].properties).forEach(([key, value]) => {
                console.log(`속성명: "${key}"`);
                console.log(`속성타입: ${value.type}`);
                if (value.type === 'checkbox') {
                    console.log(`체크박스값: ${value.checkbox}`);
                }
                console.log('---');
            });
        }

        // 데이터 변환
        const posts = response.results.map(page => {
            console.log('Processing page:', page.id);
            console.log('Page properties:', Object.keys(page.properties));
            
            // Published 속성을 동적으로 찾기
            let publishedValue = false;
            const publishedCandidates = ['Published', 'published', '공개여부', 'publish', 'Publish'];
            
            // 먼저 후보 이름들로 시도
            for (const candidate of publishedCandidates) {
                if (page.properties[candidate] && page.properties[candidate].type === 'checkbox') {
                    publishedValue = page.properties[candidate].checkbox;
                    console.log(`Found published property: "${candidate}" = ${publishedValue}`);
                    break;
                }
            }
            
            // 후보에서 못 찾았으면 모든 체크박스 속성 확인
            if (!publishedValue) {
                Object.entries(page.properties).forEach(([key, value]) => {
                    if (value.type === 'checkbox' && value.checkbox === true) {
                        console.log(`Found checked checkbox: "${key}" = ${value.checkbox}`);
                        publishedValue = value.checkbox;
                    }
                });
            }
            
            // 카테고리 속성 디버깅
            const categoryProperty = page.properties.category || page.properties.Category || page.properties['카테고리'];
            console.log('Category property:', categoryProperty);
            
            let category = '';
            if (categoryProperty) {
                if (categoryProperty.select) {
                    // 단일 선택인 경우
                    category = categoryProperty.select.name || '';
                } else if (categoryProperty.multi_select) {
                    // 다중 선택인 경우
                    category = categoryProperty.multi_select.map(cat => cat.name).join(', ') || '';
                }
            }
            console.log('Processed category:', category);
            
            const post = {
                id: page.id,
                title: getPlainText(page.properties.title || page.properties.Title || page.properties['제목']),
                content: getPlainText(page.properties.description || page.properties.Description || page.properties['설명']),
                date: (page.properties.date || page.properties.Date || page.properties['날짜'])?.date?.start || '',
                category: category,
                tags: (page.properties.tags || page.properties.Tags || page.properties['태그'])?.multi_select?.map(tag => tag.name) || [],
                published: publishedValue
            };
            
            console.log('Processed post:', post);
            return post;
        });

        console.log(`Total posts processed: ${posts.length}`);

        // data 폴더가 없으면 생성
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // JSON 파일로 저장 (객체 형태로 래핑)
        const jsonData = {
            lastUpdated: new Date().toISOString(),
            posts: posts
        };
        
        const filePath = path.join(dataDir, 'posts.json');
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        
        console.log(`Successfully saved ${posts.length} posts to ${filePath}`);
        
    } catch (error) {
        console.error('Error fetching Notion data:', error);
        process.exit(1);
    }
}

// 블록을 텍스트로 변환하는 함수
function blockToText(block) {
    const type = block.type;
    
    switch (type) {
        case 'paragraph':
            return block.paragraph.rich_text.map(text => text.plain_text).join('');
            
        case 'heading_1':
            const h1Text = block.heading_1.rich_text.map(text => text.plain_text).join('');
            return `# ${h1Text}`;
            
        case 'heading_2':
            const h2Text = block.heading_2.rich_text.map(text => text.plain_text).join('');
            return `## ${h2Text}`;
            
        case 'heading_3':
            const h3Text = block.heading_3.rich_text.map(text => text.plain_text).join('');
            return `### ${h3Text}`;
            
        case 'bulleted_list_item':
            const bulletText = block.bulleted_list_item.rich_text.map(text => text.plain_text).join('');
            return `• ${bulletText}`;
            
        case 'numbered_list_item':
            const numberedText = block.numbered_list_item.rich_text.map(text => text.plain_text).join('');
            return `1. ${numberedText}`;
            
        case 'code':
            const codeText = block.code.rich_text.map(text => text.plain_text).join('');
            return `\`\`\`\n${codeText}\n\`\`\``;
            
        case 'quote':
            const quoteText = block.quote.rich_text.map(text => text.plain_text).join('');
            return `> ${quoteText}`;
            
        case 'divider':
            return '---';
            
        default:
            // 알 수 없는 블록 타입의 경우
            console.log(`Unknown block type: ${type}`, block);
            return '';
    }
}

// 텍스트 추출 함수 (개선된 버전)
function getPlainText(property) {
    if (!property) {
        console.log('속성이 없습니다.');
        return '';
    }
    
    console.log('속성 구조:', JSON.stringify(property, null, 2));
    
    // Title 속성인 경우
    if (property.title && Array.isArray(property.title)) {
        const text = property.title.map(text => text.plain_text || '').join('');
        console.log('Title에서 추출된 텍스트:', text);
        return text;
    }
    
    // Rich Text 속성인 경우
    if (property.rich_text && Array.isArray(property.rich_text)) {
        const text = property.rich_text.map(text => text.plain_text || '').join('');
        console.log('Rich Text에서 추출된 텍스트:', text);
        return text;
    }
    
    // 기타 경우
    console.log('알 수 없는 속성 타입');
    return '';
}

// 실행
fetchNotionData();