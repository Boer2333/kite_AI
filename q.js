import chalk from 'chalk';
import fs from 'fs/promises';
import { generateRandomHeaders } from '../http.js';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

function 创建代理(代理配置) {
    if (!代理配置) return null;
    
    return 代理配置.startsWith('socks') 
        ? new SocksProxyAgent(代理配置)
        : new HttpsProxyAgent(代理配置);
}

// 加载钱包和代理配置
async function 加载配置() {
    try {
        const 数据 = await fs.readFile('wallet.csv', 'utf8');
        const 行列表 = 数据.split('\n')
            .map(行 => 行.trim())
            .filter(行 => 行 && !行.startsWith('#'));
        
        // 移除标题行
        行列表.shift();
        
        if (行列表.length === 0) {
            throw new Error('wallet.csv中未找到配置');
        }

        // 只提取钱包地址和代理字符串
        const 配置列表 = 行列表.map(行 => {
            const [, , 钱包地址, 代理] = 行.split(',').map(item => item.trim());
            return {
                钱包地址,
                代理
            };
        });

        console.log(`${chalk.green('✓')} 成功加载 ${配置列表.length} 个配置`);
        return 配置列表;
    } catch (错误) {
        console.log(`${chalk.red('[错误]')} 读取wallet.csv失败: ${错误.message}`);
        process.exit(1);
    }
}

async function 初始化终端节点配置() {
    try {
        const 问题集数据 = await fs.readFile('questions.json', 'utf8');
        const 问题配置 = JSON.parse(问题集数据);
        
        const AI终端节点 = {};
        for (const 配置 of Object.values(问题配置)) {
            AI终端节点[配置.endpoint] = {
                "代理ID": 配置.deployment_id,
                "名称": 配置.name,
                "问题集": 配置.questions
            };
        }

        return AI终端节点;

    } catch (错误) {
        console.error(`${chalk.red('❌')} 读取问题集配置失败: ${错误.message}`);
        process.exit(1);
    }
}

class 简化KiteAI自动化 {
    constructor(钱包地址, 代理配置, 任务ID, AI终端节点配置) {
        if (!AI终端节点配置) {
            throw new Error('未传入AI终端节点配置');
        }
        this.钱包地址 = 钱包地址;
        this.任务ID = 任务ID;
        this.代理配置 = 代理配置;
        this.目标成功次数 = 23;  // 需要20次成功
        this.当前互动次数 = 0;   // 总互动次数（包括失败）
        this.成功次数 = 0;       // 成功次数
        this.失败次数 = 0;       // 失败次数
        this.AI终端节点 = AI终端节点配置;
        this.API权重 = {
            "https://deployment-vxjkb0yqft5vlwzu7okkwa8l.stag-vxzy.zettablock.com/main": 0.6,
            "https://deployment-fsegykivcls3m9nrpe9zguy9.stag-vxzy.zettablock.com/main": 0.4,
            "https://deployment-xkerjnnbdtazr9e15x3y7fi8.stag-vxzy.zettablock.com/main": 0
        };
    }

    获取加权随机节点() {
        const 随机数 = Math.random();
        let 累计概率 = 0;
        
        for (const [节点, 权重] of Object.entries(this.API权重)) {
            累计概率 += 权重;
            if (随机数 <= 累计概率) {
                return 节点;
            }
        }
        
        return Object.keys(this.API权重)[0];
    }

    记录日志(表情, 信息, 颜色 = 'white') {
        const 任务前缀 = chalk.blue(`[任务 ${this.任务ID}]`);
        const 钱包前缀 = chalk.green(`[${this.钱包地址.slice(0, 6)}...]`);
        console.log(`${任务前缀} ${钱包前缀} ${chalk[颜色](`${表情} ${信息}`)}`);
    }

    async 获取最近交易() {
        this.记录日志('🔍', '扫描最近交易记录...', 'white');
        const 接口地址 = 'https://testnet.kitescan.ai/api/v2/advanced-filters';
        const 参数 = new URLSearchParams({
            transaction_types: 'coin_transfer',
            age: '5m'
        });

        try {
            const 随机请求头 = generateRandomHeaders();
            const 代理实例 = 创建代理(this.代理配置);
            const 响应 = await fetch(`${接口地址}?${参数}`, {
                agent: 代理实例,
                headers: {
                    ...随机请求头,
                    'accept': '*/*'
                },
                timeout: 10000 
            });
            const 数据 = await 响应.json();
            const 交易哈希列表 = 数据.items?.map(条目 => 条目.hash) || [];
            this.记录日志('📊', `发现${交易哈希列表.length}笔近期交易`, 'magenta');
            return 交易哈希列表;
        } catch (错误) {
            this.记录日志('❌', `交易获取失败: ${错误}`, 'red');
            return [];
        }
    }

    async 发送AI请求(终端节点, 消息) {
        const 开始时间 = Date.now();
        let 首个令牌时间 = null;
        
        // 添加整体超时控制
        const 请求超时Promise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('整体请求超时')), 20000);
        });
        
        try {
            const 请求Promise = (async () => {
                const 随机请求头 = generateRandomHeaders();
                const 合并请求头 = {
                    ...随机请求头,
                    'Accept': 'text/event-stream',
                    'Content-Type': 'application/json',
                    'Origin': 'https://agents.testnet.gokite.ai',
                    'Referer': 'https://agents.testnet.gokite.ai/'
                };
    
                const 代理实例 = 创建代理(this.代理配置);
    
                const 响应 = await fetch(终端节点, {
                    method: 'POST',
                    agent: 代理实例,
                    headers: 合并请求头,
                    body: JSON.stringify({
                        message: 消息,
                        stream: true
                    }),
                    timeout: 10000
                });
                
                首个令牌时间 = Date.now();
                
                if (!响应.ok) {
                    if (响应.status === 429) {
                        this.记录日志('⚠️', '触发速率限制，更换代理重试...', 'yellow');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    throw new Error(`HTTP错误: ${响应.status}`);
                }
                
                let 完整响应内容 = "";
                let 最后活动时间 = Date.now();
                const 超时时间 = 10000; // 30秒无响应则超时
    
                try {
                    this.记录日志('🔄', '接收AI响应中...', 'cyan');
                    for await (const 数据块 of 响应.body) {
                        最后活动时间 = Date.now();
                        const 行列表 = 数据块.toString().split('\n');
                        for (const 单行 of 行列表) {
                            if (单行.startsWith('data: ')) {
                                const 原始数据 = 单行.slice(6);
                                if (原始数据 === '[DONE]') break;
    
                                try {
                                    const 解析数据 = JSON.parse(原始数据);
                                    const 内容 = 解析数据.choices?.[0]?.delta?.content || '';
                                    if (内容) {
                                        完整响应内容 += 内容;
                                        // process.stdout.write(chalk.magenta(内容));
                                    }
                                } catch (解析错误) {
                                    continue;
                                }
                            }
    
                            // 检查是否超时
                            if (Date.now() - 最后活动时间 > 超时时间) {
                                throw new Error('响应超时');
                            }
                        }
                    }
                } catch (流错误) {
                    if (流错误.message.includes('Premature close')) {
                        // 如果已经收到了一些有效响应，可以考虑接受
                        if (完整响应内容.length > 50) {
                            this.记录日志('⚠️', '连接提前关闭，但已收到足够响应', 'yellow');
                        } else {
                            throw new Error('连接提前关闭且响应不完整');
                        }
                    } else {
                        throw 流错误;
                    }
                }
                
                console.log(); // 换行
                const 结束时间 = Date.now();
                
                return {
                    响应内容: 完整响应内容,
                    性能指标: {
                        ttft: 首个令牌时间 - 开始时间,
                        total_time: 结束时间 - 开始时间
                    }
                };
            })();
            
            // 与整体超时赛跑
            return await Promise.race([请求Promise, 请求超时Promise]);
            
        } catch (错误) {
            // console.log(); // 确保换行
            this.记录日志('❌', `AI请求失败: ${错误.message}`, 'red');
            return {
                响应内容: "",
                性能指标: {
                    ttft: 0,
                    total_time: 0
                }
            };
        }
    }

    async 上报使用情况(终端节点, 请求内容, 响应内容, 性能指标, 最大重试次数 = 10) {
        this.记录日志('📝', '反馈互动数据...', 'white');
        let 当前重试次数 = 0;
        const 上报地址 = 'https://quests-usage-dev.prod.zettablock.com/api/report_usage';
        const 上报数据 = {
            wallet_address: this.钱包地址,
            agent_id: this.AI终端节点[终端节点].代理ID,
            request_text: 请求内容,
            response_text: 响应内容,
            ttft: 性能指标.ttft,
            total_time: 性能指标.total_time,
            request_metadata: {}
        };

        while (当前重试次数 < 最大重试次数) {
            try {
                this.记录日志('📝', `尝试反馈数据... (第 ${当前重试次数 + 1} 次)`, 'white');
                
                const 随机请求头 = generateRandomHeaders();
                const 代理实例 = 创建代理(this.代理配置);
                const 结果 = await fetch(上报地址, {
                    method: 'POST',
                    agent: 代理实例,
                    headers: {
                        ...随机请求头,
                        'Content-Type': 'application/json',
                        'Origin': 'https://agents.testnet.gokite.ai',
                        'Referer': 'https://agents.testnet.gokite.ai/'
                    },
                    body: JSON.stringify(上报数据),
                    timeout: 5000
                });
    
                if (结果.status === 200) {
                    this.记录日志('✅', '数据反馈成功', 'green');
                    return true;
                }
    
                throw new Error(`HTTP状态码: ${结果.status}`);
    
            } catch (错误) {
                当前重试次数++;
                
                if (当前重试次数 >= 最大重试次数) {
                    this.记录日志('❌', `数据反馈失败，已达最大重试次数 (${最大重试次数}次)`, 'red');
                    return false;
                }

                const 延迟时间 = Math.min(1000, 3000);
                this.记录日志('⚠️', `数据反馈失败`, 'yellow');
                this.记录日志('⏳', `等待 ${延迟时间/1000} 秒后重试...`, 'yellow');
                
                await new Promise(resolve => setTimeout(resolve, 延迟时间));
            }
        }
    
        return false;
    }

    async 执行互动任务() {
        this.记录日志('🚀', `开始执行互动任务，目标: ${this.目标成功次数}次成功互动`, 'green');
        
        const 交易分析节点 = "https://deployment-xkerjnnbdtazr9e15x3y7fi8.stag-vxzy.zettablock.com/main";
        const 最大尝试次数 = 40; // 设置最大尝试次数，防止无限循环
        
        try {
            while (this.成功次数 < this.目标成功次数 && this.当前互动次数 < 最大尝试次数) {
                this.当前互动次数++;
                console.log(`\n${chalk.blue(`[任务 ${this.任务ID}]`)} ${chalk.green(`[${this.钱包地址}]`)} ${chalk.cyan('═'.repeat(60))}`);
                this.记录日志('🔄', `互动 ${this.当前互动次数} (已成功: ${this.成功次数}/${this.目标成功次数})`, 'magenta');
                
                const 随机节点 = this.获取加权随机节点();
                if (随机节点 === 交易分析节点) {
                    const 交易列表 = await this.获取最近交易();
                    if (交易列表.length > 0) {
                        this.AI终端节点[交易分析节点].问题集 = 
                            交易列表.map(交易哈希 => `What do you think of this transaction? ${交易哈希}`);
                    }
                }
                
                const 问题集 = this.AI终端节点[随机节点].问题集;
                const 随机问题 = 问题集[Math.floor(Math.random() * 问题集.length)];

                this.记录日志('🤖', `AI系统: ${this.AI终端节点[随机节点].名称}`, 'cyan');
                this.记录日志('❓', `提问: ${随机问题}`, 'cyan');

                const {响应内容, 性能指标} = await this.发送AI请求(随机节点, 随机问题);

                if (响应内容) {
                    const 上报成功 = await this.上报使用情况(随机节点, 随机问题, 响应内容, 性能指标);
                    
                    if (上报成功) {
                        this.记录日志('✅', '互动记录成功', 'green');
                        this.成功次数++;
                    } else {
                        this.记录日志('❌', '重试次数已耗尽，跳过本次互动', 'red');
                        this.失败次数++;
                    }
                } else {
                    this.记录日志('❌', 'AI请求失败，跳过反馈', 'red');
                    this.失败次数++;
                }
                
                // 显示当前统计
                this.显示统计();
                
                // 如果已达到成功次数目标，提前结束
                if (this.成功次数 >= this.目标成功次数) {
                    this.记录日志('🎉', `已达成目标成功次数: ${this.成功次数}/${this.目标成功次数}!`, 'green');
                    break;
                }
                
                // 随机等待1-3秒
                const 间隔时间 = Math.random() * 2 + 1;
                this.记录日志('⏳', `等待 ${间隔时间.toFixed(1)} 秒...`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, 间隔时间 * 1000));
            }
            
            // 检查是否达到最大尝试次数
            if (this.当前互动次数 >= 最大尝试次数 && this.成功次数 < this.目标成功次数) {
                this.记录日志('⚠️', `达到最大尝试次数(${最大尝试次数})，但未达成目标`, 'yellow');
            }
            
            this.记录日志('📋', `任务总结: 尝试${this.当前互动次数}次, 成功${this.成功次数}次, 失败${this.失败次数}次`, 'blue');
            return this.成功次数 >= this.目标成功次数;
            
        } catch (错误) {
            this.记录日志('❌', `任务执行错误: ${错误.message}`, 'red');
            return false;
        }
    }
    
    显示统计() {
        console.log(`\n${chalk.blue(`[任务 ${this.任务ID}]`)} ${chalk.green(`[${this.钱包地址}]`)} ${chalk.cyan('📊 当前统计')}`);
        console.log(`${chalk.yellow('════════════════════════════════════════════')}`);
        console.log(`${chalk.cyan('🎯 目标成功:')} ${chalk.green(this.目标成功次数)}次`);
        console.log(`${chalk.cyan('🔄 当前尝试:')} ${chalk.yellow(this.当前互动次数)}次`);
        console.log(`${chalk.cyan('✅ 成功次数:')} ${chalk.green(this.成功次数)}`);
        console.log(`${chalk.cyan('❌ 失败次数:')} ${chalk.red(this.失败次数)}`);
        console.log(`${chalk.cyan('📈 成功率:')} ${chalk.green((this.成功次数 / this.当前互动次数 * 100 || 0).toFixed(1))}%`);
        console.log(`${chalk.yellow('════════════════════════════════════════════')}`);
    }
}

async function 主程序() {
    const 配置列表 = await 加载配置();
    const AI终端节点 = await 初始化终端节点配置();

    // 设置并发限制数量
    const 并发数量 = 25; // 可以根据需要调整
    console.log(`${chalk.blue('➡️')} 开始执行，总钱包数: ${配置列表.length}，最大并发数: ${并发数量}`);
    
    // 将所有钱包配置分为队列
    let 待处理队列 = [...配置列表];
    let 运行中任务数 = 0;
    let 已完成任务数 = 0;
    
    // 执行单个钱包任务
    async function 执行钱包任务(配置, 任务ID) {
        try {
            console.log(`${chalk.green('🚀')} 开始执行钱包 ${配置.钱包地址}`);
            
            const 自动化实例 = new 简化KiteAI自动化(
                配置.钱包地址,
                配置.代理,
                任务ID,
                AI终端节点
            );
            
            // 执行互动任务，直到成功20次
            await 自动化实例.执行互动任务();
            
        } catch (错误) {
            console.error(`${chalk.red('❌')} 钱包 ${配置.钱包地址} 执行出错: ${错误.message}`);
        } finally {
            运行中任务数--;
            已完成任务数++;
            
            console.log(`${chalk.green('✅')} 钱包 ${配置.钱包地址} 已完成`);
            console.log(`${chalk.blue('📊')} 进度: ${已完成任务数}/${配置列表.length} 钱包已完成, 待处理: ${待处理队列.length}`);
            
            if (已完成任务数 === 配置列表.length) {
                console.log(`${chalk.green('🎉')} 所有钱包任务已完成!`);
            }
            
            // 启动下一个任务
            启动可用任务();
        }
    }
    
    // 启动尽可能多的任务，直到达到并发限制
    async function 启动可用任务() {
        while (运行中任务数 < 并发数量 && 待处理队列.length > 0) {
            const 配置 = 待处理队列.shift();
            运行中任务数++;
            const 任务ID = 配置列表.indexOf(配置) + 1;
            执行钱包任务(配置, 任务ID);
        }
    }
    
    // 开始执行
    启动可用任务();
}

// 进程控制
process.on('SIGINT', () => {
    console.log(`\n${chalk.yellow('🛑 正在优雅关闭...')}`);
    process.exit(0);
});

process.on('unhandledRejection', (错误) => {
    console.error(`\n${chalk.red('❌ 未处理的异常:')} ${错误.message}`);
});

主程序().catch(错误 => {
    console.error(`\n${chalk.red('❌ 致命错误:')} ${错误.message}`);
    process.exit(1);
});
