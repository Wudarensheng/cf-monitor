/**
 * 简单的Cloudflare API连接测试脚本
 */

import 'dotenv/config';
import CloudflareAPIClient from './node-functions/api/cf-api-client.js';

async function testAPIConnection() {
    console.log('开始测试Cloudflare API连接...');
    
    const cfClient = new CloudflareAPIClient();
    
    // 检查是否有API令牌
    if (!cfClient.token) {
        console.log('❌ 未找到Cloudflare API令牌');
        console.log('请设置 CF_API_TOKEN 环境变量 或 在项目根目录创建 cf_token.txt 文件');
        return;
    }
    
    console.log('✅ 找到API令牌，开始测试API连接...');
    
    try {
        // 测试获取用户信息
        console.log('\n1. 测试获取用户信息...');
        const userInfo = await cfClient.getUserInfo();
        if (userInfo && userInfo.success) {
            console.log('✅ 用户信息获取成功:', userInfo.result.email);
        } else {
            console.log('❌ 用户信息获取失败:', userInfo);
        }
        
        // 测试获取zones
        console.log('\n2. 测试获取zones...');
        const zonesResponse = await cfClient.getZones();
        if (zonesResponse && zonesResponse.success) {
            console.log(`✅ 成功获取zones，共 ${zonesResponse.result_info?.count || zonesResponse.result?.length || 0} 个`);
            if (zonesResponse.result && zonesResponse.result.length > 0) {
                console.log('前3个zone信息:');
                zonesResponse.result.slice(0, 3).forEach((zone, index) => {
                    console.log(`  ${index + 1}. ${zone.name} (ID: ${zone.id})`);
                });
            }
        } else {
            console.log('❌ 获取zones失败:', zonesResponse);
        }
        
        // 尝试获取账户ID
        console.log('\n3. 测试获取账户ID...');
        const accountId = await cfClient.getAccountId();
        if (accountId) {
            console.log('✅ 账户ID获取成功:', accountId);
        } else {
            console.log('❌ 未能获取账户ID');
        }
        
        console.log('\n🎉 API连接测试完成！');
        
    } catch (error) {
        console.error('❌ API测试过程中发生错误:', error.message);
        console.error('详细错误信息:', error.stack);
    }
}

// 运行测试
testAPIConnection();