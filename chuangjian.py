import random
import os
import time

# 定义两个AI助手的详细领域知识
modules = {
    "ai_assistant": {
        "tech_domains": [
            "Machine Learning Algorithms", "Deep Learning Models", "Neural Network Architecture", 
            "Natural Language Processing", "Computer Vision", "Reinforcement Learning",
            "Knowledge Graph Systems", "Recommendation Systems", "Anomaly Detection",
            "Federated Learning", "Transfer Learning", "Meta Learning",
            "AutoML Systems", "Time Series Analysis", "Speech Recognition",
            "Generative AI Models", "Multi-Modal Learning", "Edge AI Computing"
        ],
        "programming": [
            "Python Development", "Data Structures", "Algorithm Optimization",
            "Design Patterns", "Concurrent Programming", "Performance Tuning",
            "Code Refactoring", "Unit Testing", "CI/CD Pipeline",
            "System Architecture", "API Development", "Backend Development",
            "Clean Code Practices", "Code Review Process", "DevOps Practices",
            "Microservices Architecture", "Test-Driven Development", "Software Design"
        ],
        "frameworks": [
            "TensorFlow Framework", "PyTorch Library", "Scikit-learn Tools",
            "Keras API", "Pandas Library", "NumPy Arrays",
            "OpenCV Library", "Transformers Models", "FastAPI Framework",
            "Docker Containers", "Kubernetes Orchestration", "Ray Framework",
            "MLflow Platform", "Weights & Biases", "DVC Tools",
            "Apache Spark", "Hadoop Ecosystem", "ONNX Runtime"
        ],
        "ai_concepts": [
            "Model Training Techniques", "Feature Engineering Methods", "Data Preprocessing Steps",
            "Overfitting Prevention", "Model Evaluation Metrics", "Hyperparameter Tuning",
            "Transfer Learning Approaches", "Ensemble Learning Methods", "Attention Mechanisms",
            "Batch Normalization", "Gradient Descent Optimization", "Loss Function Selection",
            "Model Architecture Design", "Cross-Validation Techniques", "Regularization Methods",
            "Dimensionality Reduction", "Model Compression", "Neural Architecture Search"
        ]
    },
    "crypto_assistant": {
        "market_analysis": [
            "Technical Indicators", "Trend Recognition", "Support Resistance Levels",
            "Candlestick Patterns", "Wave Theory Analysis", "Fund Flow Indicators",
            "Volume Analysis Methods", "Market Sentiment Metrics", "Macro Economic Factors",
            "On-Chain Data Analytics", "Order Flow Analysis", "Market Depth Analysis",
            "Correlation Studies", "Volatility Measures", "Momentum Indicators",
            "RSI Analysis", "MACD Patterns", "Fibonacci Retracements"
        ],
        "trading_strategies": [
            "Trend Following Systems", "Dollar Cost Averaging", "Momentum Trading",
            "Grid Trading Systems", "Triangular Arbitrage", "Statistical Arbitrage",
            "Market Making Strategies", "Hedging Techniques", "Quantitative Trading",
            "High-Frequency Trading", "Mean Reversion", "Breakout Trading",
            "Range Trading", "Position Trading", "Swing Trading Methods",
            "Scalping Techniques", "Options Trading", "Futures Trading"
        ],
        "defi_concepts": [
            "Liquidity Mining", "Yield Farming Strategies", "Flash Loan Mechanisms",
            "Cross-Chain Bridges", "Stablecoin Mechanisms", "Automated Market Making",
            "Decentralized Lending", "Synthetic Assets", "Governance Tokens",
            "Staking Mechanisms", "Layer 2 Scaling", "Smart Contract Protocols",
            "DEX Aggregators", "Impermanent Loss", "Token Economics",
            "DAO Structures", "NFT Marketplaces", "DeFi Insurance"
        ],
        "risk_management": [
            "Position Sizing", "Stop-Loss Strategies", "Risk Diversification",
            "Portfolio Management", "Leverage Control", "Liquidity Risk Assessment",
            "Counterparty Risk", "Systematic Risk Analysis", "Volatility Management",
            "Risk-Reward Ratios", "Drawdown Management", "Correlation Risk",
            "Smart Contract Risk", "Platform Risk", "Regulatory Risk",
            "Market Impact Analysis", "Slippage Management", "Gas Fee Optimization"
        ]
    }
}

# 扩展的问题模板
# 扩展的问题模板部分需要改动，其他代码保持不变
question_templates = {
    "ai_assistant": [
        # 技术实现相关
        "How to implement {tech_domains} functionality using {frameworks}?",
        "What are the best practices for {ai_concepts} in {tech_domains}?",
        "How to optimize {programming} performance in {tech_domains}?",
        "How to handle {ai_concepts} issues when using {frameworks}?",
        "What are the principles of {ai_concepts} in {tech_domains}?",
        
        # 开发相关
        "How to implement {ai_concepts} in {programming} process?",
        "What should be considered when developing {tech_domains} with {frameworks}?",
        "How to improve {programming} quality in {tech_domains}?",
        "What are the methods to apply {frameworks} in {tech_domains}?",
        "What {programming} details should be considered for {ai_concepts}?",
        
        # 进阶问题
        "Can you explain the relationship between {frameworks} and {tech_domains}?",
        "What are the key factors in {ai_concepts} when dealing with {tech_domains}?",
        "How to debug {ai_concepts} problems in {frameworks}?",
        "What are the common pitfalls in {programming} when implementing {tech_domains}?",
        "How to evaluate the performance of {ai_concepts} in {tech_domains}?",
        "What are the latest developments in {tech_domains} regarding {ai_concepts}?",
        "How to scale {tech_domains} solutions using {frameworks}?",
        "What are the industry standards for {programming} in {tech_domains}?",
        "How to ensure quality when implementing {ai_concepts} with {frameworks}?",
        "What are the best tools for {programming} in {tech_domains}?"
    ],
    "crypto_assistant": [
        # 市场分析相关
        "How to analyze market trends using {market_analysis}?",
        "What is the effectiveness of combining {market_analysis} with {trading_strategies}?",
        "How to optimize {trading_strategies} using {market_analysis}?",
        "What is the impact of {defi_concepts} on {market_analysis}?",
        "How to evaluate {risk_management} using {market_analysis}?",
        
        # 交易策略相关
        "How to adjust {trading_strategies} under different market conditions?",
        "What is the best way to combine {trading_strategies} with {risk_management}?",
        "What are the key considerations for {trading_strategies} in {defi_concepts}?",
        "How to measure the effectiveness of {trading_strategies}?",
        "What are the methods to implement {trading_strategies} in {defi_concepts}?",
        
        # DeFi和风险管理
        "How to assess {risk_management} in {defi_concepts}?",
        "What are the best practices for {risk_management} when using {defi_concepts}?",
        "What are the main {risk_management} factors in {defi_concepts}?",
        
        # 进阶问题
        "What are the key metrics for evaluating {market_analysis}?",
        "How to develop custom {trading_strategies} based on {market_analysis}?",
        "What are the emerging trends in {defi_concepts} affecting {trading_strategies}?",
        "How to build a comprehensive {risk_management} framework for {defi_concepts}?",
        "What are the relationships between {market_analysis} and {defi_concepts}?",
        "How to optimize {trading_strategies} for different market phases?",
        "What are the common mistakes in {risk_management} for {trading_strategies}?"
    ]
}

def generate_question(module):
    """生成特定模块的问题"""
    template = random.choice(question_templates[module])
    
    # 为模板中的每个字段随机选择一个值
    values = {
        field: random.choice(modules[module][field])
        for field in modules[module].keys()
    }
    
    try:
        return template.format(**values)
    except KeyError as e:
        print(f"Template error in {module}: {str(e)}")
        return None

def generate_unique_questions(module, count, max_attempts=1000000):
    """生成不重复的问题"""
    questions = set()
    attempts = 0
    start_time = time.time()
    
    while len(questions) < count and attempts < max_attempts:
        attempts += 1
        
        if attempts % 1000 == 0:
            elapsed_time = time.time() - start_time
            questions_generated = len(questions)
            progress = questions_generated / count * 100
            speed = questions_generated / elapsed_time if elapsed_time > 0 else 0
            
            print(f"{module.upper()} Progress: {progress:.2f}% "
                  f"(Generated: {questions_generated}, "
                  f"Speed: {speed:.2f} q/s)")
        
        question = generate_question(module)
        if question:
            questions.add(f'"{question}",')
        
        # 如果生成效率太低，提前退出
        if attempts > len(questions) * 10:
            print(f"Warning: Difficulty generating unique questions for {module}")
            break
    
    return questions

def main():
    output_folder = "generated_questions"
    os.makedirs(output_folder, exist_ok=True)
    
    questions_per_module = 10000  # 每个模块50000个问题
    
    total_start_time = time.time()
    
    for module in ["ai_assistant", "crypto_assistant"]:
        print(f"\nGenerating questions for {module}...")
        
        filename = f"{module}_questions.txt"
        output_file = os.path.join(output_folder, filename)
        
        questions = generate_unique_questions(module, questions_per_module)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for question in questions:
                f.write(question + '\n')
        
        print(f"Successfully generated {len(questions)} questions for {module}")
    
    total_time = time.time() - total_start_time
    print(f"\nTotal generation time: {total_time:.2f} seconds")
    print("All questions have been generated successfully!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nGeneration interrupted by user.")
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
    finally:
        print("\nProgram finished.")