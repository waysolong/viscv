import { Card, Tag, Typography } from "antd";
import PageCard from "../components/ui/PageCard";

interface MetricInfo {
  name: string;
  badge: string;
  color: string;
  formula: string;
  meaning: string;
  usage: string;
}

const DETECTION: MetricInfo[] = [
  { name: "IoU 交并比",
    badge: "基础",
    color: "default",
    formula: "IoU = 交集面积 / 并集面积",
    meaning: "衡量预测框与真实框的重合程度，范围 0~1。它是检测里一切后续指标的‘地基’。",
    usage: "通常以 IoU≥0.5 判定一个框算不算预测对了。ultralytics 用 box_iou 计算。" },
  { name: "Precision 精确率",
    badge: "检测",
    color: "blue",
    formula: "P = TP / (TP + FP)",
    meaning: "在所有你预测‘有目标’的结果里，真正有目标的比例。越高，越少‘打错’（误检越少）。",
    usage: "担心误检（把背景当目标）时更看重它。ultralytics 报告为 metrics/precision。" },
  { name: "Recall 召回率",
    badge: "检测",
    color: "blue",
    formula: "R = TP / (TP + FN)",
    meaning: "在所有真实存在的目标里，你找到了多少。越高，漏检越少。",
    usage: "担心漏检（把真目标当背景）时更看重它。ultralytics 报告为 metrics/recall。" },
  { name: "F1 分数",
    badge: "检测",
    color: "geekblue",
    formula: "F1 = 2PR / (P + R)",
    meaning: "精确率与召回率的调和平均，单一数值衡量权衡。",
    usage: "P、R 要一起看时用它兜底；ultralytics 会绘制 P/R/F1 随置信度的曲线。" },
  { name: "AP 平均精度",
    badge: "检测",
    color: "purple",
    formula: "AP = ∫ P(r) dr（PR 曲线下面积）",
    meaning: "对某个类别，在不同置信度下画出 P-R 曲线并求面积。面积越大，该类别检测越稳。",
    usage: "ultralytics 用 compute_ap() / ap_per_class() 逐类计算。" },
  { name: "mAP50",
    badge: "检测",
    color: "volcano",
    formula: "所有类别 AP 在 IoU=0.5 下的均值",
    meaning: "传统上最常用的总指标，只看‘框得够不够准到一半以上重叠’。",
    usage: "intuitive、便于比模型。ultralytics 报告为 metrics/mAP50。" },
  { name: "mAP75",
    badge: "检测",
    color: "volcano",
    formula: "所有类别 AP 在 IoU=0.75 下的均值",
    meaning: "比 mAP50 更严格，要求框定位更精确。",
    usage: "需要‘高精度定位’（如测量/工业检测）时更关注。ultralytics 提供 map75。" },
  { name: "mAP50-95（主指标）",
    badge: "检测",
    color: "red",
    formula: "在 IoU 0.5→0.95（步长 0.05）共 10 档下 AP 的均值",
    meaning: "对定位精度要求最全面、最严格的核心指标；对框不准很敏感。",
    usage: "ultralytics 主报告指标，记为 metrics/mAP50-95；多数论文/榜单都以此为主。" },
  { name: "ConfusionMatrix 混淆矩阵",
    badge: "可视化",
    color: "green",
    formula: "预测×真实 的计数矩阵",
    meaning: "直观看到每个类别被误判成谁（哪些 FP / FN / 类别混淆）。",
    usage: "ultralytics 的 ConfusionMatrix 类，val 时自动绘制。" },
  { name: "PR 曲线 / MC 曲线",
    badge: "可视化",
    color: "green",
    formula: "P-R 随置信度变化 / 指标随置信度变化",
    meaning: "观察不同置信度阈值下精度与召回如何此消彼长，选择合理的置信度。",
    usage: "plot_pr_curve() 与 plot_mc_curve()。" },
];

const TASKS: MetricInfo[] = [
  { name: "Accuracy Top-1",
    badge: "分类",
    color: "cyan",
    formula: "Top-1 = 首位预测正确数 / 总数",
    meaning: "分类任务里最常见的正确率：取预测概率最高的那一个类是否猜对。",
    usage: "ultralytics 报告为 metrics/accuracy_top1。" },
  { name: "Accuracy Top-5",
    badge: "分类",
    color: "cyan",
    formula: "Top-5 = 真实类别是否出现在前 5 个预测里",
    meaning: "更宽松：前五个候选里含真实类别即算对，适合类别多、难区分的任务。",
    usage: "ImageNet 常用；ultralytics 记为 metrics/accuracy_top5。" },
  { name: "OKS（姿态）关键点相似度",
    badge: "姿态",
    color: "orange",
    formula: "基于关键点距离 + 各点归一化标准差(OKS_SIGMA)的高斯相似度",
    meaning: "衡量姿态关键点预测与真实有多接近，考虑部位尺度差异。",
    usage: "姿态检测的 mAP 就是用 OKS 阈值计算的（val.py 里 kpt_iou / PoseMetrics）。" },
  { name: "Mask mAP（分割）",
    badge: "分割",
    color: "gold",
    formula: "基于 mask 像素交并比(mask_iou)的 AP 均值",
    meaning: "评估分割掩膜的贴合度，而不只看外接框。",
    usage: "ultralytics 分割任务记为 metrics/mAP50-95(M)。" },
  { name: "mAP50-95(OBB) 旋转框",
    badge: "OBB",
    color: "lime",
    formula: "旋转框 IoU（probiou）下的 mAP50-95",
    meaning: "面向带角度的旋转目标框，用旋转框重叠度计算。",
    usage: "detect/obb 任务，用 probiou 计算旋转 IoU。" },
  { name: "fitness（模型选择用）",
    badge: "工具",
    color: "default",
    formula: "加权汇总：0.1×mAP50 + 0.9×mAP50-95（对 detection）",
    meaning: "ultralytics 内部用一个加权标量给模型‘打分’，便于自动选最优权重。",
    usage: "train 自动保存 best.pt 就依据它。" },
];

function MetricCard({ m }: { m: MetricInfo }) {
  return (
    <Card size="small" className="flex h-full flex-col">
      <div className="mb-1 flex items-center justify-between">
        <Typography.Text strong>{m.name}</Typography.Text>
        <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{m.badge}</Tag>
      </div>
      <Typography.Text code style={{ fontSize: 12 }}>{m.formula}</Typography.Text>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 8, marginBottom: 4 }}>
        <b>作用：</b>{m.meaning}
      </Typography.Paragraph>
      <Typography.Paragraph style={{ fontSize: 12, color: "#595959", marginBottom: 0 }} className="mt-auto">
        <b>怎么用：</b>{m.usage}
      </Typography.Paragraph>
    </Card>
  );
}

export default function MetricsGuide() {
  return (
    <PageCard
      title="模型评价指标说明"
      extra={<Tag color="purple">源自 Ultralytics YOLO</Tag>}
    >
      <Typography.Paragraph type="secondary">
        以下是 ultralytics 训练/验证时报告的核心指标说明。理解每个指标衡量什么，才能对着日志判断模型改得好不好。
      </Typography.Paragraph>

      <Typography.Title level={5}>检测 / 通用指标</Typography.Title>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DETECTION.map((m) => <MetricCard key={m.name} m={m} />)}
      </div>

      <Typography.Title level={5} style={{ marginTop: 24 }}>分类 / 姿态 / 分割 / OBB</Typography.Title>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TASKS.map((m) => <MetricCard key={m.name} m={m} />)}
      </div>

      <Typography.Title level={5} style={{ marginTop: 24 }}>怎么看 ultralytics 的验证输出</Typography.Title>
      <Typography.Paragraph>
        训练完成会打印类似：<Typography.Text code>Class , Images, Instances, Box(P R mAP50 mAP50-95)</Typography.Text>
        ，其中 <b>P/R</b> 是精确率/召回率，<b>mAP50</b>、<b>mAP50-95</b> 是两个核心定位指标。
        ultralytics 内部用 <Typography.Text code>fitness = 0.1·mAP50 + 0.9·mAP50-95</Typography.Text> 自动挑选并保存{' '}
        <Typography.Text code>best.pt</Typography.Text>。
      </Typography.Paragraph>
    </PageCard>
  );
}