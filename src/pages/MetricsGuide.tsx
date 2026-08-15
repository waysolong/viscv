import { useState } from "react";
import { Card, Tag, Typography, Modal } from "antd";
import PageCard from "../components/ui/PageCard";
import { AJIViz, Bars, ConfusionViz, IoUViz, Legend, Line, TPFPFNViz } from "../components/MetricVisuals";

interface MetricInfo { name: string; badge: string; color: string; short: string }

const METRICS: MetricInfo[] = [
  { name: "IoU 交并比", badge: "基础", color: "default", short: "重叠程度的地基指标" },
  { name: "Precision 精确率", badge: "检测", color: "blue", short: "预测命中率，误检视角" },
  { name: "Recall 召回率", badge: "检测", color: "blue", short: "找到多少真目标，漏检视角" },
  { name: "F1 分数", badge: "检测", color: "geekblue", short: "P/R 的调和平均" },
  { name: "AP 平均精度", badge: "检测", color: "purple", short: "单类别 PR 曲线下面积" },
  { name: "mAP50", badge: "检测", color: "volcano", short: "IoU=0.5 下的均值 AP" },
  { name: "mAP75", badge: "检测", color: "volcano", short: "IoU=0.75，更严格" },
  { name: "mAP50-95（主指标）", badge: "检测", color: "red", short: "10 档 IoU 的平均，最严" },
  { name: "ConfusionMatrix 混淆矩阵", badge: "可视化", color: "green", short: "谁被误判成谁" },
  { name: "PR 曲线 / MC 曲线", badge: "可视化", color: "green", short: "指标随置信度变化" },
  { name: "Accuracy Top-1 / Top-5", badge: "分类", color: "cyan", short: "分类正确率" },
  { name: "OKS（姿态）", badge: "姿态", color: "orange", short: "关键点相似度" },
  { name: "Mask mAP（分割）", badge: "分割", color: "gold", short: "掩膜贴合度" },
  { name: "AJI 聚合 Jaccard", badge: "细胞分割", color: "magenta", short: "实例分割聚合指标，惩罚漏检/误检与切分" },
  { name: "PQ 全景质量", badge: "分割", color: "magenta", short: "RQ×SQ，兼顾识别与分割质量" },
  { name: "mAP50-95(OBB) 旋转框", badge: "OBB", color: "lime", short: "旋转框重叠" },
  { name: "fitness（选模型用）", badge: "工具", color: "default", short: "ultralytics 评分" },
];

function Block({ t }: { t: string }) {
  return <Typography.Paragraph style={{ marginBottom: 10 }}>{t}</Typography.Paragraph>;
}
function H({ t }: { t: string }) {
  return <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 8 }}>{t}</Typography.Title>;
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "2px 0", fontSize: 13 }}>
      <span style={{ width: 120, color: "#888", flexShrink: 0 }}>{k}</span><span>{v}</span>
    </div>
  );
}
const NotReal = () => (
  <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
    * 以下数据为说明用的示例数值，非真实模型结果
  </Typography.Text>
);

function MetricDetail({ name }: { name: string }) {
  switch (name) {
    case "IoU 交并比":
      return (<>
        <H t="定义" /><Block t="IoU = 交集面积 / 并集面积。衡量预测框与真实框的重合程度，0~1 之间。它是检测一切指标的‘地基’。"/>
        <H t="图解" /><IoUViz />
        <Legend items={[{color:"#16a34a",label:"真实框 GT"},{color:"#3b82f6",label:"预测框"},{color:"#ef4444",label:"交集"}]} />
        <H t="示例数据" />
        <Row k="交集面积" v="70×60 = 4200" /><Row k="并集面积" v="12000+7500-4200 = 15300" />
        <Row k="IoU" v="4200 / 15300 ≈ 0.275" /><Row k="判定" v="&lt; 0.5 → 该框算漏检/误检" />
        <NotReal />
      </>);
    case "Precision 精确率":
      return (<>
        <H t="定义" /><Block t="P = TP / (TP + FP)。在你预测‘有目标’的结果里，真正对的占比。越高说明误检越少。"/>
        <H t="图解（TP/FP/FN/TN）" /><TPFPFNViz />
        <Legend items={[{color:"#16a34a",label:"TP 对"},{color:"#ef4444",label:"FP 误报"},{color:"#f59e0b",label:"FN 漏检"},{color:"#9ca3af",label:"TN 正确背景"}]} />
        <H t="示例数据" /><Row k="预测命中 TP" v="7" /><Row k="误报 FP" v="3" />
        <Row k="Precision" v="7 / (7+3) = 0.70" /><Row k="使用场景" v="更怕误检（把背景当目标）时优先看它" />
        <NotReal />
      </>);
    case "Recall 召回率":
      return (<>
        <H t="定义" /><Block t="R = TP / (TP + FN)。所有真实目标里你找到了多少。越高说明漏检越少。"/>
        <H t="示例数据" /><Row k="找到 TP" v="7" /><Row k="漏检 FN" v="3" />
        <Row k="Recall" v="7 / (7+3) = 0.70" /><Row k="使用场景" v="更怕漏检（把真目标当背景）时优先看它" />
        <NotReal />
      </>);
    case "F1 分数":
      return (<>
        <H t="定义" /><Block t="F1 = 2PR / (P+R)，精确率与召回率的调和平均，一个数兼看两边。"/>
        <H t="示例数据" /><Row k="P / R" v="0.70 / 0.70" />
        <Row k="F1" v="2×0.7×0.7 / (0.7+0.7) = 0.70" />
        <Row k="注意" v="平衡且不偏科时 F1 高；极端偏 P 或偏 R 都会拉低它" />
        <NotReal />
      </>);
    case "AP 平均精度": {
      const pr: [number, number][] = [[0, 1], [0.1, 1], [0.3, 0.95], [0.5, 0.8], [0.7, 0.6], [0.85, 0.4], [0.95, 0.2]];
      return (<>
        <H t="定义" /><Block t="AP = PR 曲线下的面积。把某类别的 Precision-Re call 随置信度画出，曲线越‘贴右上角’越好，数值 0~1 或称 0~100%。"/>
        <H t="PR 曲线" /><Line points={pr} color="#16a34a" height={200} xLabel="Recall" yLabel="Precision" />
        <H t="示例数据" /><Row k="曲线下面积 AP" v="约 0.72（右图阴影近似）" />
        <Row k="含义" v="该类别在不同置信度下整体都稳，AP 才高" />
        <NotReal />
      </>);
    }
    case "mAP50":
      return (<>
        <H t="定义" /><Block t="mAP50 = 所有类别在 IoU=0.5 下 AP 的均值。最直观的检测总指标。"/>
        <H t="每类 AP @ IoU0.5" />
        <Bars items={[{label:"Cat",value:0.82},{label:"Dog",value:0.74},{label:"Bird",value:0.6}]} color="#f97316" />
        <H t="示例数据" /><Row k="mAP50" v="(0.82+0.74+0.60)/3 = 0.72" />
        <NotReal />
      </>);
    case "mAP75":
      return (<>
        <H t="定义" /><Block t="mAP75 = 所有类别在 IoU=0.75 下 AP 的均值。要求框得更准。"/>
        <Bars items={[{label:"mAP50",value:0.72},{label:"mAP75",value:0.55}]} color="#ef4444" />
        <H t="示例数据" /><Row k="对比" v="mAP75 通常明显低于 mAP50，说明定位精度是短板" /><NotReal />
      </>);
    case "mAP50-95（主指标）": {
      const io = [0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95];
      const vals = [0.72,0.70,0.68,0.66,0.63,0.55,0.48,0.40,0.30,0.20];
      return (<>
        <H t="定义" /><Block t="mAP50-95 = 在 IoU=0.5~0.95（步长 0.05，共 10 档）下分别算 mAP，再取平均。对定位精度最严格，也是 ultralytics 主报告指标。"/>
        <H t="各 IoU 阈值下的 mAP" />
        <Line points={io.map((x, i) => [x, vals[i]] as [number, number])} color="#dc2626" xLabel="IoU 阈值" yLabel="mAP" />
        <H t="示例数据" /><Row k="平均" v="(0.72+0.70+…+0.20)/10 ≈ 0.53" /><NotReal />
      </>);
    }
    case "ConfusionMatrix 混淆矩阵":
      return (<>
        <H t="定义" /><Block t="统计每个真实类别被预测成哪个类别的样本数，直观暴露最容易混淆的一对。"/>
        <ConfusionViz matrix={[[80,10,6],[5,70,8],[7,4,85]]} labels={["Cat","Dog","Bird"]} />
        <H t="读法" /><Block t="对角线越大越好；右图里 Cat→Dog 有 10 例误判，Dog→Bird 有 8 例，说明这两对最易混。" />
        <NotReal />
      </>);
    case "PR 曲线 / MC 曲线":
      return (<>
        <H t="定义" /><Block t="把不同置信度阈值下的 Precision/Recall（或 mAP 等）画成曲线，帮你选‘阈值设多少’最划算。"/>
        <H t="P-R 随置信度" /><Line points={[[0.2,0.9],[0.4,0.72],[0.6,0.55],[0.8,0.4]]} color="#7c3aed" xLabel="置信度阈值" yLabel="Precision" />
        <H t="使用" /><Block t="一般找一个 P 和 R 都比较高的点（常看 F1 峰值），把置信度定在那里。" />
        <NotReal />
      </>);
    case "Accuracy Top-1 / Top-5":
      return (<>
        <H t="定义" /><Block t="Top-1：首位预测是否就是真实类别；Top-5：真实类别是否落在前 5 个候选里。类别多/难区分时 Top-5 更宽容。"/>
        <Bars items={[{label:"Top-1",value:0.70},{label:"Top-5",value:0.91}]} color="#06b6d4" />
        <H t="示例数据" /><Row k="100 张测试图" v="Top-1 对 70 张，Top-5 命中 91 张" /><NotReal />
      </>);
    case "OKS（姿态）":
      return (<>
        <H t="定义" /><Block t="OKS 用关键点预测与真实之间的‘加权高斯相似度’衡量，权重由各点尺度标准差(OKS_SIGMA)决定，越靠近 1 越准。姿态任务的 mAP 按 OKS 阈值算。"/>
        <H t="示例数据" /><Row k="关键点: 鼻子" v="距离 2px，sigma 0.026 → 贡献高" />
        <Row k="关键点: 手腕" v="距离 15px，sigma 较大 → 稍宽松" /><Row k="整组 OKS" v="≈ 0.84" /><NotReal />
      </>);
    case "Mask mAP（分割）":
      return (<>
        <H t="定义" /><Block t="Mask mAP 用掩膜像素级交并比(mask_iou)替代外接框算 AP，衡量分割边界贴合得多细。"/>
        <Bars items={[{label:"Box mAP50",value:0.72},{label:"Mask mAP50",value:0.66}]} color="#ca8a04" />
        <NotReal />
      </>);
    case "mAP50-95(OBB) 旋转框":
      return (<>
        <H t="定义" /><Block t="旋转框用带角度的旋转 IoU（probiou）计算重叠，mAP50-95 对旋转目标更准确。"/>
        <Bars items={[{label:"OBB mAP50",value:0.78},{label:"OBB mAP50-95",value:0.60}]} color="#65a30d" />
        <NotReal />
      </>);
    case "fitness（选模型用）":
      return (<>
        <H t="定义" /><Block t="ultralytics 用一个加权标量给模型打分以便自动挑 best.pt：detect 任务 fitness = 0.1×mAP50 + 0.9×mAP50-95。"/>
        <Row k="示例" v="0.1×0.72 + 0.9×0.53 = 0.549" /><NotReal />
      </>);
    case "AJI 聚合 Jaccard":
      return (<>
        <H t="定义" /><Block t="AJI（Aggregated Jaccard Index）是实例分割的聚合 IoU：除匹配对的交集/并集外，把漏检的 GT、误检的预测也计入惩罚，能反映‘一个真目标被多个预测切分’或漏检的问题，核/细胞分割常用。"/>
        <H t="图解" /><AJIViz />
        <H t="公式" /><Block t="AJI = Σ|GT∩P| / ( Σ|GT∪P| + Σ漏检GT + Σ误检pred )" />
        <H t="示例数据" /><Row k="匹配对交集" v="1500 px²" /><Row k="匹配对并集" v="2100 px²" />
        <Row k="漏检GT + 误检pred" v="+800 + 550 px²" /><Row k="AJI" v="1500 / (2100+800+550) ≈ 0.435" /><NotReal />
      </>);
    case "PQ 全景质量":
      return (<>
        <H t="定义" /><Block t="PQ（Panoptic Quality）用于全景/实例分割：PQ = RQ × SQ。RQ 是识别质量（该认的认对没），SQ 是分割质量（轮廓贴合得细不细）。"/>
        <H t="公式" /><Block t="SQ = ΣIoU / TP；RQ = TP/(TP + 0.5·FP + 0.5·FN)；PQ = RQ × SQ" />
        <H t="图解" /><Bars items={[{label:"SQ",value:0.80},{label:"RQ",value:0.85},{label:"PQ",value:0.68}]} color="#d946ef" />
        <H t="示例数据" /><Row k="SQ / RQ" v="0.80 / 0.85" /><Row k="PQ" v="0.80 × 0.85 = 0.68" /><NotReal />
      </>);
    default:
      return null;
  }
}

export default function MetricsGuide() {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <PageCard title="模型评价指标说明" extra={<Tag color="purple">源自 Ultralytics YOLO</Tag>}>
      <Typography.Paragraph type="secondary">
        ultralytics 训练/验证时报告的核心指标。点击任意指标卡片，可查看图解与示例数据详解。
      </Typography.Paragraph>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((m) => (
          <Card key={m.name} size="small" hoverable onClick={() => setSel(m.name)} className="cursor-pointer h-full">
            <div className="mb-1 flex items-center justify-between">
              <Typography.Text strong>{m.name}</Typography.Text>
              <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{m.badge}</Tag>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{m.short}</Typography.Text>
          </Card>
        ))}
      </div>
      <Modal open={!!sel} title={sel} onCancel={() => setSel(null)} footer={null} width={880}>
        {sel && <MetricDetail name={sel} />}
      </Modal>
    </PageCard>
  );
}