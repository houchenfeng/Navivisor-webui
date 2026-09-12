export interface II18nTexts {
  id: string; lang: 'zh' | 'en';
  searchPlaceholder: string; languages: string; notifications: string; activity: string; tasks: string; username: string;
  news: string; viewAll: string; activeVenues: string; openForSubmissions: string; allVenues: string; clickToSubmit: string; deadline: string;
  goBackHome: string; submissionBtn: string;
  title: string; authors: string; keywords: string; abstract: string; write: string; preview: string; aiAssist: string; generating: string; submit: string; cancel: string; submitting: string; track: string; submissionFormat: string; tldr: string; pdfUpload: string; choosePdf: string; pdfHint: string; pdfTip: string; emailSharing: string; dataRelease: string; license: string; readers: string; signatures: string;
  submissionNo: string; decision: string; pending: string; result: string; initialReviewCompleted: string; reviews: string; reviewer: string; score: string; summary: string; strengths: string; weaknesses: string; questions: string; confidence: string; rebuttal: string; submitRebuttal: string; scoreExplanation: string; excellent: string; good: string; fair: string; poor: string; rebuttalNote: string; authorRebuttal: string; authorRebuttalDesc: string; rebuttalTips: string; rebuttalTip1: string; rebuttalTip2: string; rebuttalTip3: string; rebuttalTip4: string; rebuttalTip5: string; rebuttalEditTip: string; characters: string; disclaimer: string;
  stepHome: string; stepVenue: string; stepSubmit: string; stepReviews: string; stepRebuttal: string; stepDecision: string;
  reviewing: string;
  returnHome: string;
  accepted: string; acceptedOral: string; congratulations: string; round1Score: string; round2Score: string; round1Comment: string; round2Comment: string; rebuttalResponse: string; authorFinalRemarks: string; restart: string;
  acknowledgments: string; acknowledgmentsPlaceholder: string; wordCount: string;
  rejected: string; rejectedMessage: string; nextSteps: string; nextStep1: string; nextStep2: string; nextStep3: string;
  demoToggle: string;
  cameraReady: string; cameraReadyHint: string; cameraReadyDeadline: string; submitFinal: string; finalSubmitted: string; acceptedPoster: string;
  guideClickVenue: string; guideClickSubmitBtn: string; guideAiAssist: string; guideSubmitRebuttal: string;
  loading: string;
}

const zhTexts: Omit<II18nTexts, 'id' | 'lang'> = {
  searchPlaceholder: '搜索...', languages: '语言', notifications: '通知', activity: '动态', tasks: '任务', username: '用户',
  news: '新闻', viewAll: '查看全部', activeVenues: '进行中的会议', openForSubmissions: '开放投稿', allVenues: '全部会议', clickToSubmit: '点击这里投稿 👉', deadline: '截止日期',
  goBackHome: '← 返回 OpenReview 首页', submissionBtn: 'CVPR 2026 会议投稿',
  title: '标题', authors: '作者', keywords: '关键词', abstract: '摘要', write: '编辑', preview: '预览', aiAssist: 'AI辅助填写', generating: '正在生成...', submit: '提交', cancel: '取消', submitting: '正在提交中...', track: '赛道', submissionFormat: '提交格式 / 页数限制', tldr: '一句话总结', pdfUpload: 'PDF 上传', choosePdf: '选择 PDF', pdfHint: '请上传由论文生成工具产出的 PDF 文件。', pdfTip: '💡 提示：请先上传论文 PDF，AI 会自动帮你填写标题、作者、摘要和关键词。', emailSharing: '邮件分享', dataRelease: '数据发布', license: '许可证', readers: '读者', signatures: '签名',
  submissionNo: '投稿编号', decision: '决定', pending: '待决定', result: '结果', initialReviewCompleted: '初审已完成。评审意见已发布。最终接收决定将在 Rebuttal 阶段结束后，由领域主席（Area Chair）综合所有评审意见及作者回复后做出。请在截止日期前提交 Rebuttal。', reviews: '评审意见', reviewer: '评审人', score: '评分', summary: '总结', strengths: '优点', weaknesses: '不足', questions: '问题', confidence: '置信度', rebuttal: '作者回复', submitRebuttal: '提交 Rebuttal', scoreExplanation: '评分说明', excellent: '优秀', good: '良好', fair: '一般', poor: '较差', rebuttalNote: '提示：三位评审人给出了 Accept / Weak Accept / Borderline Accept 的推荐意见，均分 5.0 处于边缘区间。最终决定由领域主席（Area Chair）在 Rebuttal 后综合做出，一份有力的 Rebuttal 可以有效提升被接收的概率。', authorRebuttal: '作者回复', authorRebuttalDesc: '逐条回应审稿意见。请保持礼貌、专业，并回应每一个问题。', rebuttalTips: 'Rebuttal 写作建议', rebuttalTip1: '感谢审稿人的时间和反馈', rebuttalTip2: '回应每一位审稿人的每一条 weakness 和 question', rebuttalTip3: '具体说明你会在终稿中做哪些修改', rebuttalTip4: '不要防御性反驳——承认合理的担忧', rebuttalTip5: '保持简洁，按审稿人分组组织内容', rebuttalEditTip: '提示：在 Rebuttal 截止日期前你都可以编辑修改。', characters: '字符', disclaimer: 'CVPR 投稿流程练习环境。本网站与 OpenReview 或 CVPR 无关。',
  stepHome: '首页', stepVenue: '会议', stepSubmit: '投稿', stepReviews: '评审', stepRebuttal: '回复', stepDecision: '结果',
  reviewing: '正在评议中...',
  returnHome: '返回首页',
  accepted: '已接受', acceptedOral: '已接受（口头报告）', congratulations: '恭喜！您的论文已被接受。', round1Score: '第一轮评分', round2Score: '第二轮评分', round1Comment: '第一轮意见', round2Comment: '第二轮意见', rebuttalResponse: 'Rebuttal 回复', authorFinalRemarks: '作者总结感言', restart: '重新开始流程',
  acknowledgments: '作者感言 / Acknowledgments', acknowledgmentsPlaceholder: '写下你想对审稿人、导师、合作者说的话...', wordCount: '字数',
  rejected: '已拒绝', rejectedMessage: '很遗憾，您的论文未被接收。感谢您的投稿，建议根据审稿意见修改后重新投稿。', nextSteps: '常见下一步建议', nextStep1: '根据审稿意见修改论文，补充实验后再投其他会议', nextStep2: '与导师讨论改进方向，明确核心贡献与创新点', nextStep3: '完善相关工作与基线对比，增强实验说服力',
  demoToggle: '切换结果',
  cameraReady: '提交 Camera-Ready 最终版', cameraReadyHint: '恭喜中稿！请上传论文最终版 PDF', cameraReadyDeadline: '截止日期', submitFinal: '提交最终版', finalSubmitted: '最终版已提交成功！🎉', acceptedPoster: '已接受（海报展示）',
  guideClickVenue: '点击这里投稿 👉', guideClickSubmitBtn: '点击开始投稿 👆', guideAiAssist: '点击 AI 辅助填写试试吧 👉', guideSubmitRebuttal: '点击提交作者回复 👇',
  loading: '加载中...',
};

const enTexts: Omit<II18nTexts, 'id' | 'lang'> = {
  searchPlaceholder: 'Search...', languages: 'Languages', notifications: 'Notifications', activity: 'Activity', tasks: 'Tasks', username: 'User',
  news: 'News', viewAll: 'View all', activeVenues: 'Active Venues', openForSubmissions: 'Open for Submissions', allVenues: 'All Venues', clickToSubmit: '点击这里投稿 👉', deadline: 'Deadline',
  goBackHome: '← Go to OpenReview homepage', submissionBtn: 'CVPR 2026 Conference Submission',
  title: 'Title', authors: 'Authors', keywords: 'Keywords', abstract: 'Abstract', write: 'Write', preview: 'Preview', aiAssist: 'AI Assist', generating: 'Generating...', submit: 'Submit', cancel: 'Cancel', submitting: 'Submitting...', track: 'Track', submissionFormat: 'Submission Format / Page Limit', tldr: 'TL;DR', pdfUpload: 'PDF Upload', choosePdf: 'Choose PDF', pdfHint: 'Please upload the paper PDF generated by your writing tool.', pdfTip: '💡 提示：请先上传论文 PDF，AI 会自动帮你填写标题、作者、摘要和关键词。', emailSharing: 'Email Sharing', dataRelease: 'Data Release', license: 'License', readers: 'Readers', signatures: 'Signatures',
  submissionNo: 'Submission', decision: 'Decision', pending: 'Pending', result: 'Result', initialReviewCompleted: 'Reviews have been released. The final acceptance decision will be made by the Area Chair after the rebuttal period, taking into account all reviews and the authors\' response. Please submit your rebuttal before the deadline.', reviews: 'Reviews', reviewer: 'Reviewer', score: 'Score', summary: 'Summary', strengths: 'Strengths', weaknesses: 'Weaknesses', questions: 'Questions', confidence: 'Confidence', rebuttal: 'Rebuttal', submitRebuttal: 'Submit Rebuttal', scoreExplanation: 'Score Explanation', excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', rebuttalNote: '提示：三位评审人给出了 Accept / Weak Accept / Borderline Accept 的推荐意见，均分 5.0 处于边缘区间。最终决定由领域主席（Area Chair）在 Rebuttal 结束后综合做出，一份有力的 Rebuttal 可以明显提高被接收的概率。', authorRebuttal: 'Author Rebuttal', authorRebuttalDesc: 'Respond to reviewer comments. Be polite, professional, and address every point.', rebuttalTips: 'Rebuttal Tips', rebuttalTip1: 'Thank reviewers for their time and feedback', rebuttalTip2: 'Address EVERY weakness and question from EVERY reviewer', rebuttalTip3: 'Be specific about what you will change in the camera-ready version', rebuttalTip4: 'Do not be defensive — acknowledge valid concerns', rebuttalTip5: 'Keep it concise and well-organized by reviewer', rebuttalEditTip: 'Tip: You can edit this until the rebuttal deadline.', characters: 'characters', disclaimer: 'CVPR submission workflow practice environment. Not affiliated with OpenReview or CVPR.',
  stepHome: 'Home', stepVenue: 'Venue', stepSubmit: 'Submit', stepReviews: 'Reviews', stepRebuttal: 'Rebuttal', stepDecision: 'Decision',
  reviewing: 'Under review...',
  returnHome: 'Back to homepage',
  accepted: 'Accepted', acceptedOral: 'Accepted (Oral)', congratulations: 'Congratulations! Your paper has been accepted.', round1Score: 'Round 1 Score', round2Score: 'Round 2 Score', round1Comment: 'Round 1 Comment', round2Comment: 'Round 2 Comment', rebuttalResponse: 'Rebuttal Response', authorFinalRemarks: 'Author Final Remarks', restart: 'Restart Workflow',
  acknowledgments: 'Acknowledgments', acknowledgmentsPlaceholder: 'Write what you want to say to reviewers, your advisor, and collaborators...', wordCount: 'words',
  rejected: 'Rejected', rejectedMessage: 'We regret to inform you that your paper has not been accepted. Thank you for your submission. We encourage you to revise based on the reviewer comments and resubmit.', nextSteps: 'Suggested Next Steps', nextStep1: 'Revise the paper based on reviewer comments, add experiments, and submit to another venue', nextStep2: 'Discuss improvement directions with your advisor, clarify core contributions and novelty', nextStep3: 'Strengthen related work and baseline comparisons for more convincing experiments',
  demoToggle: 'Toggle Result',
  cameraReady: 'Submit Camera-Ready Final Version', cameraReadyHint: 'Congratulations! Please upload the final camera-ready version of your paper PDF.', cameraReadyDeadline: 'Camera-ready deadline', submitFinal: 'Submit Final Version', finalSubmitted: 'Final version submitted successfully! 🎉', acceptedPoster: 'Accepted (Poster)',
  guideClickVenue: '点击这里投稿 👉', guideClickSubmitBtn: '点击开始投稿 👆', guideAiAssist: '点击 AI 辅助填写试试吧 👉', guideSubmitRebuttal: '点击提交作者回复 👇',
  loading: 'Loading...',
};

export const MOCK_I18N: II18nTexts[] = [
  { id: '1', lang: 'zh', ...zhTexts },
  { id: '2', lang: 'en', ...enTexts },
];
