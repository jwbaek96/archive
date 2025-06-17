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
        
        // 노션 데이터베이스에서 데이터 가져오기 (필터 없이 먼저 테스트)
        const response = await notion.databases.query({
            database_id: databaseId,
            sorts: [
                {
                    property: 'Date',
                    direction: 'descending'
                }
            ]
        });

        // 데이터 변환
        const posts = response.results.map(page => {
            console.log('Processing page:', page.id);
            return {
                id: page.id,
                title: getPlainText(page.properties.Title || page.properties.Name),
                content: getPlainText(page.properties.Content),
                date: page.properties.Date?.date?.start || page.properties.Created?.date?.start || '',
                tags: page.properties.Tags?.multi_select?.map(tag => tag.name) || [],
                published: page.properties.Published?.checkbox || false
            };
        });

        // data 폴더가 없으면 생성
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // JSON 파일로 저장
        const filePath = path.join(dataDir, 'posts.json');
        fs.writeFileSync(filePath, JSON.stringify(posts, null, 2));
        
        console.log(`Successfully saved ${posts.length} posts to ${filePath}`);
        
    } catch (error) {
        console.error('Error fetching Notion data:', error);
        process.exit(1);
    }
}

// 텍스트 추출 함수
function getPlainText(richText) {
    if (!richText || !richText.title) return '';
    return richText.title.map(text => text.plain_text).join('');
}

// 실행
fetchNotionData();