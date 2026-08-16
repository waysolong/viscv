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
  { name: "mAP50-95(OBB) 旋转框", badge: "OBB", color: "lime", short: "旋转框重叠" },
  { name: "AJI 聚合 Jaccard", badge: "细胞分割", color: "magenta", short: "实例分割聚合指标" },
  { name: "PQ 全景质量", badge: "分割", color: "magenta", short: "RQ×SQ，兼顾识别与分割" },
  { name: "fitness（选模型用）", badge: "工具", color: "default", short: "ultralytics 评分" },
];

const box = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", margin: "8px 0", fontSize: 13 };
function Block({ t }: { t: string }) { return <Typography.Paragraph style={{ marginBottom: 10 }}>{t}</Typography.Paragraph>; }
function H({ t }: { t: string }) { return <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 6 }}>{t}</Typography.Title>; }
function Analogy({ c }: { c: string }) {
  return <div style={{ ...box, background: "#f5f3ff", borderColor: "#ddd6fe" }}><b>打个比方：</b>{c}</div>;
}
function Formula({ c }: { c: string }) { return <div style={{ ...box, background: "#f8fafc" }}>{c}</div>; }
function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: "flex", gap: 8, padding: "2px 0", fontSize: 13 }}><span style={{ width: 132, color: "#888", flexShrink: 0 }}>{k}</span><span>{v}</span></div>;
}
const NotReal = () => (<Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>* 以下为说明用的示例数值，非真实模型结果</Typography.Text>);

function MetricDetail({ name }: { name: string }) {
  switch (name) {
    case "IoU 交并比": return (<>
      <Block t="一句话：IoU 衡量‘模型画的框’和‘正确答案的框’到底有多重叠，是检测里最底层的‘重叠尺子’。" />
      <H t="通俗理解" /><Analogy c="两个框（一张对勾、一张标准）叠在一起。重叠得越多说明画得越准。IoU 就是把‘两块共有的部分’除以‘两块拼起来的总面积’。" />
      <H t="公式" /><Formula c="IoU = 交集面积 / 并集面积 = 两块的重叠区域 ÷ (框A + 框B − 重叠区域)" />
      <H t="图解" /><IoUViz />
      <Legend items={[{color:"#16a34a",label:"真实框 GT"},{color:"#3b82f6",label:"预测框"},{color:"#ef4444",label:"交集"}]} />
      <H t="手把手算一遍" />
      <Row k="交集面积" v="70×60 = 4200" /><Row k="并集面积" v="12000+7500−4200 = 15300" />
      <Row k="IoU" v="4200 ÷ 15300 ≈ 0.275" /><Row k="判定" v="IoU<0.5 → 通常算没对上（漏检/误检）" />
      <H t="什么时候看 / 常踩的坑" />
      <Block t="它是后面所有 mAP 的基础。坑：IoU 只看‘框’，完全不看框里内容对不对——框盖住了 90% 但类别猜错，IoU 照样高。所以向下看类别，向上看 mAP。" />
      <NotReal />
    </>);
    case "Precision 精确率": return (<>
      <Block t="一句话：在你所有‘说这里有目标’的判断里，有多少次是真的说对了。衡量误检。" />
      <Analogy c="你当‘抓小偷巡逻员’：一晚上拦下 10 个人，其中 7 个真是小偷，3 个是路人。你的精确率 = 7/10 = 70%——拦得越多越容易误伤路人，精确率就掉。" />
      <H t="公式" /><Formula c="Precision = TP / (TP + FP)" />
      <H t="图解（TP/FP/FN/TN）" /><TPFPFNViz />
      <Legend items={[{color:"#16a34a",label:"TP 真阳性（对有，说有）"},{color:"#ef4444",label:"FP 假阳性（没有，说有）"},{color:"#f59e0b",label:"FN 假阴性（有，说没有）"},{color:"#9ca3af",label:"TN 真阴性（没有，说没有）"}]} />
      <H t="名词速记" />
      <Row k="TP 真阳性" v="确实有目标，你预测有" /><Row k="FP 假阳性" v="根本没有，你预测有（误报）" />
      <Row k="FN 假阴性" v="其实有，你漏了（漏报）" /><Row k="TN 真阴性" v="确实没有，你也说没有" />
      <H t="手把手算一遍" /><Row k="TP=7, FP=3" v="Precision = 7/(7+3) = 0.70" />
      <H t="什么时候看" /><Block t="怕误检（比如安防别把行人当目标狂报警）时，精确率比召回率更值得盯。" /><NotReal />
    </>);
    case "Recall 召回率": return (<>
      <Block t="一句话：所有‘真实存在的目标’里，你找到了多少。衡量漏检。" />
      <Analogy c="还是抓小偷：今晚实际上有 15 个小偷，你只抓到 7 个，剩下 8 个溜了。召回率 = 7/15 ≈ 47%——漏抓越多召回率越低。" />
      <H t="公式" /><Formula c="Recall = TP / (TP + FN)" />
      <H t="手把手算一遍" /><Row k="TP=7, FN=8" v="Recall = 7/(7+8) = 0.4667" />
      <H t="Precision vs Recall" />
      <Row k="精确率在乎" v="说我有的，到底对不对（少误报）" /><Row k="召回率在乎" v="真的有的是不是都找齐（少漏报）" />
      <H t="什么时候看" /><Block t="怕漏报（比如漏掉一个肿瘤、漏掉一个行人）时，召回率是底线指标。" />
      <NotReal />
    </>);
    case "F1 分数": return (<>
      <Block t="一句话：Precision 和 Recall 有点像‘跷跷板’——调阈值常一个上另一个下。F1 把两者拧成一个数，看综合水平。" />
      <H t="公式" /><Formula c="F1 = 2×P×R / (P+R)（调和平均）" />
      <Analogy c="就像期末“总分”但偏科会扣分：P=0.9、R=0.1 算术平均能得 0.5，但 F1 只有 0.18——因为它惩罚‘偏科’。" />
      <H t="手把手算一遍" /><Row k="P=0.70, R=0.70" v="F1 = 2×0.7×0.7/(0.7+0.7) = 0.70" />
      <Row k="P=0.90, R=0.20" v="F1 = 2×0.9×0.2/1.1 ≈ 0.33（偏科被惩罚）" />
      <H t="什么时候看" /><Block t="不想在误检和漏检之间选边站、只想一个数字看平衡度时，看 F1。调阈值到 F1 最大，通常是个不错的默认值。" />
      <NotReal />
    </>);
    case "AP 平均精度": {
      const pr: [number, number][] = [[0, 1], [0.1, 1], [0.3, 0.95], [0.5, 0.8], [0.7, 0.6], [0.85, 0.4], [0.95, 0.2]];
      return (<>
        <Block t="一句话：对【某一个类别】，把所有置信度下的 Precision 和 Recall 画成一条曲线，曲线下的面积就是 AP。反映这一类整体好不好。" />
        <Analogy c="想象你把‘判断是否是一只猫’的装置从‘很怀疑才说猫’调到‘很含糊就说猫’：严格时几乎不说错但漏掉很多（P高R低），宽松时找得全但误报多（R高P低）。把所有可能都试一遍，画出的曲线越‘贴右上角’，AP 越高。" />
        <H t="图解：某类别 PR 曲线" />
        <Line points={pr} color="#16a34a" height={200} xLabel="Recall (召回率)" yLabel="Precision (精确率)" />
        <H t="手把手" /><Row k="曲线下面积" v="约 0.72（右图）" />
        <Row k="含义" v="这个类别在宽松/严格各种阈值下整体都稳，AP 才高" />
        <H t="注意（重要）" />
      <Block t="① AP 是“每个类别一个数”，所有类别的 AP 平均才是 mAP，别混淆。② 画 AP 用的 PR 曲线必须先【按类别分组】，再到组内【按置信度排序、逐框 IoU 匹配】——具体画法见「PR 曲线 / MC 曲线」详解。" />
        <NotReal />
      </>);
    }
    case "mAP50": return (<>
      <Block t="一句话：把每个类别的 AP 算出来（在 IoU=0.5 的宽松标准下），再取平均，就是一个好记的总分 mAP50。" />
      <H t="公式" /><Formula c="mAP50 = (AP_猫 + AP_狗 + AP_鸟 + …) ÷ 类别数，且 IoU 判定阈值=0.5" />
      <H t="图解：每类 AP" />
      <Bars items={[{label:"Cat",value:0.82},{label:"Dog",value:0.74},{label:"Bird",value:0.6}]} color="#f97316" />
      <H t="手把手" /><Row k="mAP50" v="(0.82+0.74+0.60)/3 = 0.72" />
      <H t="什么时候看" /><Block t="IoU=0.5 很宽松（框得差不多就算对），所以 mAP50 偏高、好上手比较。真正要斤斤计较定位精度，看 mAP50-95。" />
      <NotReal />
    </>);
    case "mAP75": return (<>
      <Block t="一句话：和 mAP50 一样的算法，只是把‘对上’的标准从重叠 50% 提到 75%，更严格。" />
      <Bars items={[{label:"mAP50",value:0.72},{label:"mAP75",value:0.55}]} color="#ef4444" />
      <H t="解读" /><Row k="mAP75 vs mAP50" v="通常明显更低说明‘框得不够细’，是定位精度短板" />
      <H t="什么时候看" /><Block t="需要高精度定位（测量、工业检测、切图对齐）时更关心 mAP75。" />
      <NotReal />
    </>);
    case "mAP50-95（主指标）": {
      const io = [0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95];
      const vals = [0.72,0.70,0.68,0.66,0.63,0.55,0.48,0.40,0.30,0.20];
      return (<>
        <Block t="一句话：把 IoU 从 0.5 一路调到 0.95（每 0.05 一档，共 10 档），每档算一次 mAP，再全部平均。这是最严格、也是论文/榜单最看重的定位指标。" />
        <H t="图解：各 IoU 阈值下的 mAP" />
        <Line points={io.map((x, i) => [x, vals[i]] as [number, number])} color="#dc2626" xLabel="IoU 阈值" yLabel="mAP" />
        <H t="手把手" /><Row k="10 档之和" v="0.72+0.70+…+0.20" /><Row k="mAP50-95" v="和 ÷ 10 ≈ 0.53" />
        <H t="为什么它是主角" /><Block t="因为它同时惩罚“框得不够准”。别人说 mAP 多少，默认指 mAP50-95，别拿 mAP50 充数。" />
        <NotReal />
      </>);
    }
    case "ConfusionMatrix 混淆矩阵": return (<>
      <Block t="一句话：把每个‘真实类别’被模型认成‘哪个类别’的样本数排成一张表，一眼看清谁和谁最容易搞混。" />
      <ConfusionViz matrix={[[80,10,6],[5,70,8],[7,4,85]]} labels={["Cat","Dog","Bird"]} />
      <H t="怎么读" /><Block t="对角线越大越健康（认对）。右图 Cat→Dog 有 10 例、Dog→Bird 有 8 例，说明‘猫狗’和‘狗鸟’最易混，训练时可对症补数据。" />
      <H t="和大类指标的关系" /><Block t="mAP 只给你一个总分；想改进就得靠混淆矩阵定位到底哪一对在打架。" />
      <NotReal />
    </>);
    case "PR 曲线 / MC 曲线": return (<>
      <Block t="一句话：PR 曲线记录‘改变置信度阈值时 Precision 和 Recall 如何此消彼长’，曲线下面积就是 AP。它一定是在【某个类别内部】算的。" />
      <Analogy c="阈值低 = 来者不拒（抓得全但误报多）；阈值高 = 宁缺毋滥（报得准但漏得多）。曲线就是这条权衡的完整记录。" />
      <H t="完整画法（先分组、再匹配、后排序）" />
      <Block t="第 1 步 · 按类别分组：只挑“猫”的预测框和猫的真实框，其他类别一概不进来（每条 PR 曲线对应一个类别）。" />
      <Block t="第 2 步 · 逐框 IoU 匹配：把猫的预测框与猫的真实框做 IoU 匹配（IoU≥0.5 算对上）。命中且前一个真实框还没被占用 → TP；没命中 → FP；没被任何预测认领的真实框 → FN。且一个真实框只能被认领一次。" />
      <Block t="第 3 步 · 组内按置信度从高到低排序：匹配过的预测框按置信度降序排好。" />
      <Block t="第 4 步 · 扫阈值：从最严（只放最高置信度）到最松（全放），每档按已放进的预测统计 TP/FP/FN，算出 P 和 R。" />
      <Block t="第 5 步 · 连线：以 Recall 为横轴、Precision 为纵轴把这些点连成折线 → 该类别 PR 曲线；曲线下面积 = 该类别 AP。" />
      <Block t="第 6 步 · 汇总：对每个类别各画一条，取各自 AP 的平均 → mAP。" />
      <H t="图解：某类别的 P-R 权衡" /><Line points={[[0.2,0.9],[0.4,0.72],[0.6,0.55],[0.8,0.4]]} color="#7c3aed" xLabel="置信度阈值" yLabel="Precision" />
      <H t="怎么用" /><Block t="一般选 P、R 都尽量高的那个阈值（常看 F1 峰）。想让曲线右上角更大，就要提高“既报得准又不漏”的能力——这往往靠更多/更干净的数据或更好的网络。" />
      <NotReal />
    </>);
    case "Accuracy Top-1 / Top-5": return (<>
      <Block t="一句话：分类任务的‘正确率’。Top-1 是第一名就猜对；Top-5 是前五个候选里有一个猜对就行。" />
      <Analogy c="像高考志愿：Top-1 = 必须第一志愿录取；Top-5 = 前五个志愿里录到一个都算赢。类别越难分，Top-5 越宽容。" />
      <Bars items={[{label:"Top-1",value:0.70},{label:"Top-5",value:0.91}]} color="#06b6d4" />
      <H t="手把手" /><Row k="100 张测试图" v="Top-1 对 70 张，Top-5 命中 91 张" />
      <H t="什么时候看" /><Block t="ImageNet 这类类别超多的榜单常用 Top-1/Top-5 双开。" />
      <NotReal />
    </>);
    case "OKS（姿态）": return (<>
      <Block t="一句话：姿态任务里，衡量‘模型点出来的关键点（鼻子、手腕…）’离真的有多近。OKS 越接近 1 越准。" />
      <Analogy c="给照片标关节：有的点位每个人胖瘦远近不一样，直接比像素距离不公平。OKS 会按每个点的尺度标准差(SIGMA)做归一化——大部位允许差一点，小部位不允许差太多。" />
      <H t="公式" /><Formula c="OKS = Σ exp(−dᵢ²/(2·S²·σᵢ²)) / 关键点数量，其中 dᵢ=该点距离，S=目标尺寸，σᵢ=该点归一化系数" />
      <H t="手把手（示意）" />
      <Row k="鼻子" v="距离 2px，σ 较小 → 对它的要求严" /><Row k="手腕" v="距离 15px，σ 较大 → 稍宽松" />
      <Row k="整组 OKS" v="≈ 0.84" />
      <H t="什么时候看" /><Block t="姿态的 mAP 就是按 OKS 阈值（如 0.5/0.75/0.9）分档算的。" />
      <NotReal />
    </>);
    case "Mask mAP（分割）": return (<>
      <Block t="一句话：分割任务里不只看外接框，而是看模型涂出来的‘轮廓像素’和真实轮廓有多贴。好了说明模型把边抠得细。" />
      <Bars items={[{label:"Box mAP50",value:0.72},{label:"Mask mAP50",value:0.66}]} color="#ca8a04" />
      <H t="手把手" /><Row k="Box vs Mask" v="Mask 用像素级交并比，通常略低于框版，更苛求轮廓" />
      <NotReal />
    </>);
    case "mAP50-95(OBB) 旋转框": return (<>
      <Block t="一句话：普通框横平竖直；OBB 是带角度的旋转框（像飞机、路牌这类斜着的东西）。用旋转框的重叠度算 AP。" />
      <Bars items={[{label:"OBB mAP50",value:0.78},{label:"OBB mAP50-95",value:0.60}]} color="#65a30d" />
      <H t="解读" /><Row k="旋转 IoU" v="ultralytics 用 probiou 计算带角度的重叠" /><NotReal />
    </>);
    case "AJI 聚合 Jaccard": return (<>
      <Block t="一句话：实例分割（尤其核/细胞分割）里的聚合 IoU。它额外惩罚漏检、误检，以及‘一个真目标被切成好几块’的情况。" />
      <H t="公式" /><Formula c="AJI = Σ|GT∩P| / ( Σ|GT∪P| + Σ漏检GT + Σ误检pred )" />
      <H t="图解" /><AJIViz />
      <H t="为什么比朴素 IoU 严" /><Block t="一张图里细胞一堆，朴素 IoU 对不上就算 0；AJI 把‘完全没配上的 GT/预测’的面积也加进分母，等于漏一个就扣分，细胞被切成两半也一样被罚。" />
      <H t="手把手" /><Row k="匹配对交集/并集" v="1500 / 2100 px²" /><Row k="漏检GT + 误检pred" v="+800 + 550 px²" /><Row k="AJI" v="1500 / (2100+800+550) ≈ 0.435" /><NotReal />
    </>);
    case "PQ 全景质量": return (<>
      <Block t="一句话：全景/实例分割的总分，拆成两块：识不认得对（RQ）× 轮廓贴不贴（SQ）。" />
      <H t="公式" /><Formula c="SQ = ΣIoU/TP；RQ = TP/(TP+0.5·FP+0.5·FN)；PQ = RQ × SQ" />
      <Bars items={[{label:"SQ 分割质量",value:0.80},{label:"RQ 识别质量",value:0.85},{label:"PQ",value:0.68}]} color="#d946ef" />
      <H t="手把手" /><Row k="SQ / RQ" v="0.80 / 0.85" /><Row k="PQ" v="0.80×0.85 = 0.68" />
      <H t="解读" /><Row k="两个都不是 1" v="乘起来在 0~1；认错对象(SQ 受害)和切不准(RQ 受害)都会拉低总分" /><NotReal />
    </>);
    case "fitness（选模型用）": return (<>
      <Block t="一句话：ultralytics 训练时用这个加权分数自动挑最优权重存成 best.pt，你不用手动比一堆指标。" />
      <H t="公式（detect）" /><Formula c="fitness = 0.1×mAP50 + 0.9×mAP50-95" />
      <H t="手把手" /><Row k="mAP50 / mAP50-95" v="0.72 / 0.53" /><Row k="fitness" v="0.1×0.72 + 0.9×0.53 = 0.549" />
      <H t="解读" /><Row k="权重 0.9 在 mAP50-95" v="主指标权重更高，选的模型更看重严格定位" />
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
        ultralytics 训练/验证时报告的核心指标，用小白也能懂的方式讲解。点击任意卡片查看详解。
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