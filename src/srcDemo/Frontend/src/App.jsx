import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import {
  AlertCircle,
  Clock,
  Zap,
  BarChart3,
  FileText,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import "./App.css";
import { set } from "date-fns";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

Chart.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

const API_BASE_URL = "http://localhost:5002/api";

const MOCK_CIRCUITS = [
  {
    id: "1",
    name: "multiplier",
    optimization_level: "-O0",
    total_constraints: 1200,
    linear_constraints: 800,
    nonlinear_constraints: 400,
    compilation_time: 2.1,
    proof_generation_time: 5.3,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "multiplier",
    optimization_level: "-O1",
    total_constraints: 900,
    linear_constraints: 700,
    nonlinear_constraints: 200,
    compilation_time: 1.5,
    proof_generation_time: 3.8,
    created_at: new Date(Date.now() - 50000000).toISOString(),
  },
  {
    id: "3",
    name: "multiplier",
    optimization_level: "-O2",
    total_constraints: 700,
    linear_constraints: 600,
    nonlinear_constraints: 100,
    compilation_time: 1.1,
    proof_generation_time: 2.5,
    created_at: new Date(Date.now() - 20000000).toISOString(),
  },
  {
    id: "4",
    name: "hash_circuit",
    optimization_level: "-O1",
    total_constraints: 1500,
    linear_constraints: 1000,
    nonlinear_constraints: 500,
    compilation_time: 2.8,
    proof_generation_time: 6.1,
    created_at: new Date(Date.now() - 30000000).toISOString(),
  },
  {
    id: "5",
    name: "multiplier",
    optimization_level: "-O2",
    total_constraints: 600,
    linear_constraints: 600,
    nonlinear_constraints: 100,
    compilation_time: 1.1,
    proof_generation_time: 2.5,
    created_at: new Date(Date.now() + 20000000).toISOString(),
  },
];

function App() {
  const [circuits, setCircuits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDashboardCircuit, setSelectedDashboardCircuit] = useState("");
  const [selectedFreqCircuit, setSelectedFreqCircuit] = useState("");
  const [showAllVersions, setShowAllVersions] = useState(false);
  const USE_MOCK = false;
  // Form state
  const [circuitName, setCircuitName] = useState("");
  const [circuitCode, setCircuitCode] = useState("");
  const [proofInput, setProofInput] = useState("");
  const [optimizationLevel, setOptimizationLevel] = useState("-O1");
  const [selectedLogs, setSelectedLogs] = useState([
    "constraints",
    "compilation_time",
    "proof_time",
  ]);
  const [file, setFile] = useState(null);
  const [proofInputFile, setProofInputFile] = useState(null);
  // Form Ref
  const fileInputRef = useRef(null);
  const proofInputFileRef = useRef(null);
  // Sample circuit code
  const sampleCircuit = `pragma circom 2.0.0;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;
    
    c <== a * b;
}

component main = Multiplier2();`;

  const sampleProofInput = `{
  "a": 3,
  "b": 5
}`;

  useEffect(() => {
    if (USE_MOCK) {
      setCircuits(MOCK_CIRCUITS);
    } else {
      fetchCircuits();
    }
  }, []);

  const fetchCircuits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/circuits/all`);
      if (response.ok) {
        const data = await response.json();
        const mapCircuit = (c) => ({
          name: c.name,
          optimization_level: normalizeOptimizationLevel(c.opt_level),
          total_constraints: c.constraint_total,
          linear_constraints: c.constraint_linear,
          nonlinear_constraints: c.constraint_non_linear,
          compilation_time: c.compile_time,
          proof_generation_time: c.proving_time,
          created_at: c.recorded_at,
          // signals: c.signals ?? 0,
        });
        setCircuits(data.map(mapCircuit));
      }
    } catch (err) {
      console.error("Failed to fetch circuits:", err);
    }
  };

  // useEffect(() => {
  //   // For demo, use mock data instead of fetchCircuits
  //   setCircuits(MOCK_CIRCUITS)
  // }, [])

  // const analyzeCircuit = async () => {
  //   if (!circuitName.trim() || (!circuitCode.trim() && !file)) {
  //     setError("Please provide both circuit name and code or upload file");
  //     return;
  //   }

  //   setLoading(true);
  //   setError("");
  //   setSuccess("");

  //   try {
  //     let body;
  //     let headers = {};
  //     if (file) {
  //       body = new FormData();
  //       body.append("circuit_name", circuitName);
  //       body.append("optimization_level", optimizationLevel);
  //       body.append("logs", JSON.stringify(selectedLogs));
  //       body.append("circuit_file", file);
  //     } else {
  //       body = JSON.stringify({
  //         circuit_name: circuitName,
  //         circuit_code: circuitCode,
  //         optimization_level: optimizationLevel,
  //         logs: selectedLogs,
  //       });
  //       headers["Content-Type"] = "application/json";
  //     }

  //     const response = await fetch(`${API_BASE_URL}/circuits/analyze`, {
  //       method: "POST",
  //       headers,
  //       body,
  //     });

  //     const data = await response.json();

  //     if (response.ok) {
  //       setSuccess("Circuit analyzed successfully!");
  //       setCircuitName("");
  //       setCircuitCode("");
  //       setFile(null);
  //       fetchCircuits();
  //     } else {
  //       setError(data.error || "Analysis failed");
  //     }
  //   } catch (err) {
  //     setError("Network error: " + err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const analyzeCircuit = async () => {
    if (!circuitName.trim() || (!circuitCode.trim() && !file)) {
      setError("Please provide both circuit name and code or upload file");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Compile first
      const body = JSON.stringify({
        name: circuitName,
        circuitCode,
        opt_level: optimizationLevel.replace("-O", "o").toLowerCase(),
        inputJson: proofInput || "{}", // vẫn truyền input, mặc định {}
      });

      const compileRes = await fetch(`${API_BASE_URL}/circuits/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const compileData = await compileRes.json();

      if (!compileRes.ok)
        throw new Error(compileData.error || "Compile failed");

      let successMsg = "Circuit compiled successfully.";

      // Step 2: If user chose "Include proving" → call /prove
      if (selectedLogs.includes("proof_time") && proofInput.trim()) {
        const provingRes = await fetch(`${API_BASE_URL}/circuits/prove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: circuitName,
            version_hash:
              compileData.compileResult?.version_hash ||
              compileData.compileResult?.hash, // version_hash FE cần giữ lại
            inputJson: proofInput,
          }),
        });

        const provingData = await provingRes.json();

        if (!provingRes.ok)
          throw new Error(provingData.error || "Proving failed");

        successMsg += ` Proof generated successfully. Proving time: ${provingData.proving_time} ms`;
      }

      setSuccess(successMsg);
      setCircuitName("");
      setCircuitCode("");
      setFile(null);
      setProofInput("");
      setProofInputFile(null);
      fetchCircuits();
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCircuit = async (circuitId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/circuits/${circuitId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess("Circuit deleted successfully!");
        fetchCircuits();
      }
    } catch (err) {
      setError("Failed to delete circuit");
    }
  };

  const loadSampleCircuit = () => {
    setCircuitName("sample_multiplier");
    setCircuitCode(sampleCircuit);
    setFile(null);
  };

  const formatTime = (timeValue) => {
    if (timeValue === undefined || timeValue === null || isNaN(timeValue)) {
      return "N/A";
    }
    const seconds = Number(timeValue);
    if (seconds < 1) {
      return `${(seconds * 1000).toFixed(0)}ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      // Database trả về UTC time, cần convert sang local time
      const date = new Date(dateString + "Z"); // Thêm 'Z' để đảm bảo parse như UTC
      return date.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  const normalizeOptimizationLevel = (level) => {
    if (!level) return "-O1"; // default
    if (level.startsWith("-")) return level; // already normalized
    return `-${level.toUpperCase()}`; // convert o0 -> -O0, o1 -> -O1, etc.
  };

  const getOptimizationBadgeColor = (level) => {
    switch (level) {
      case "-O0":
        return "bg-red-100 text-red-800";
      case "-O1":
        return "bg-yellow-100 text-yellow-800";
      case "-O2":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCircuitCode(evt.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleProofInputFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofInputFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => setProofInput(evt.target.result);
      reader.readAsText(file);
    }
  };

  // Handle log selection
  const handleLogChange = (log) => {
    setSelectedLogs((prev) =>
      prev.includes(log) ? prev.filter((l) => l !== log) : [...prev, log]
    );
  };

  // Lấy danh sách circuit name duy nhất
  const circuitNames = Array.from(new Set(circuits.map((c) => c.name)));

  // Lọc dữ liệu theo circuit đã chọn
  const dashboardCircuits = circuits.filter(
    (c) => c.name === selectedDashboardCircuit
  );

  const levels = ["-O0", "-O1", "-O2"];
  // const constraints = levels.map((lvl) => {
  //   const found = dashboardCircuits.find((c) => c.optimization_level === lvl);
  //   return found ? found.total_constraints : null;
  // });
  // const linearConstraints = levels.map((lvl) => {
  //   const found = dashboardCircuits.find((c) => c.optimization_level === lvl);
  //   return found ? found.linear_constraints : null;
  // });
  // const nonlinearConstraints = levels.map((lvl) => {
  //   const found = dashboardCircuits.find((c) => c.optimization_level === lvl);
  //   return found ? found.nonlinear_constraints : null;
  // });
  // const proofTimes = levels.map((lvl) => {
  //   const found = dashboardCircuits.find((c) => c.optimization_level === lvl);
  //   return found ? found.proof_generation_time : null;
  // });

  const constraints = levels.map((lvl) => {
    const found = dashboardCircuits
      .filter((c) => c.optimization_level === lvl)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return found ? found.total_constraints : null;
  });
  const linearConstraints = levels.map((lvl) => {
    const found = dashboardCircuits
      .filter((c) => c.optimization_level === lvl)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return found ? found.linear_constraints : null;
  });
  const nonlinearConstraints = levels.map((lvl) => {
    const found = dashboardCircuits
      .filter((c) => c.optimization_level === lvl)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return found ? found.nonlinear_constraints : null;
  });
  const proofTimes = levels.map((lvl) => {
    const found = dashboardCircuits
      .filter((c) => c.optimization_level === lvl)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return found ? found.proof_generation_time : null;
  });

  // Group by time interval (can be customized)
  function groupByTimeInterval(arr, field = "created_at", interval = "hour") {
    if (!arr || arr.length === 0) return {};
    
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const startOfToday = now.startOf('day');  // 00:00:00 hôm nay
    
    // Filter chỉ lấy data từ 00:00 hôm nay đến hiện tại
    const filteredToday = arr.filter((item) => {
      try {
        const itemDate = dayjs(item[field] + "Z").tz('Asia/Ho_Chi_Minh');
        return itemDate.isAfter(startOfToday) && itemDate.isBefore(now);
      } catch (e) {
        return false;
      }
    });
    
    const freq = {};
    filteredToday.forEach((item) => {
      try {
        const date = dayjs(item[field] + "Z").tz('Asia/Ho_Chi_Minh');
        const timeKey = date.format("HH:00");  // Chỉ giờ, nhưng chỉ từ hôm nay
        freq[timeKey] = (freq[timeKey] || 0) + 1;
      } catch (e) {
        console.warn("Error parsing date:", item[field], e);
      }
    });
    
    // Tạo array từ 00:00 đến giờ hiện tại
    const currentHour = now.hour();
    const result = {};
    for (let i = 0; i <= currentHour; i++) {
      const hour = String(i).padStart(2, '0') + ':00';
      result[hour] = freq[hour] || 0;
    }
    
    return result;
  }
  
  // You can change "hour" to "minute", "day", or "hour-only" as needed
  const compileFreq = groupByTimeInterval(dashboardCircuits, "created_at");
  const proofFreq = groupByTimeInterval(
    dashboardCircuits.filter(
      (c) => c.proof_generation_time !== undefined && c.proof_generation_time !== null
    ),
    "created_at"
  );

  // Group by time interval - Last 7 Days only
  function groupByTimeInterval(arr, field = "created_at", interval = "day") {
    if (!arr || arr.length === 0) return {};
    
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const startTime = now.subtract(7, 'days').startOf('day');  // 7 ngày trước 00:00:00
    
    console.log(`Debug - Last 7 days, Start: ${startTime.format()}, End: ${now.format()}`);
    
    // Filter data trong 7 ngày cuối
    const filteredData = arr.filter((item) => {
      try {
        const itemDate = dayjs(item[field] + "Z").tz('Asia/Ho_Chi_Minh');
        return itemDate.isAfter(startTime) && itemDate.isBefore(now);
      } catch (e) {
        return false;
      }
    });
    
    const freq = {};
    filteredData.forEach((item) => {
      try {
        const date = dayjs(item[field] + "Z").tz('Asia/Ho_Chi_Minh');
        const timeKey = date.format("MM-DD");  // Daily format: "07-15", "07-16"
        freq[timeKey] = (freq[timeKey] || 0) + 1;
      } catch (e) {
        console.warn("Error parsing date:", item[field], e);
      }
    });
    
    // Tạo 7 ngày labels (hôm nay và 6 ngày trước)
    const result = {};
    for (let i = 6; i >= 0; i--) {
      const day = now.subtract(i, 'days');
      const label = day.format("MM-DD");
      result[label] = freq[label] || 0;
    }
    
    return result;
  }
  
  // Chỉ thị trường hợp nào cần gọi groupByTimeInterval ở đây
  const compileFreqLast7Days = groupByTimeInterval(dashboardCircuits, "created_at", "day");
  const proofFreqLast7Days = groupByTimeInterval(
    dashboardCircuits.filter(
      (c) =>
        c.proof_generation_time !== undefined &&
        c.proof_generation_time !== null
    ),
    "created_at", 
    "day"
  );

  // // Dashboard data
  // const dashboardData = (() => {
  //   // Group by optimization level
  //   const levels = ["-O0", "-O1", "-O2"];
  //   const constraints = levels.map((lvl) => {
  //     const found = circuits.filter((c) => c.optimization_level === lvl);
  //     return found.length > 0 ? found[0].total_constraints : 0;
  //   });
  //   const proofTimes = levels.map((lvl) => {
  //     const found = circuits.filter((c) => c.optimization_level === lvl);
  //     return found.length > 0 ? found[0].proof_generation_time || 0 : 0;
  //   });
  //   return { levels, constraints, proofTimes };
  // })();
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CirMetrics</h1>
          <p className="text-lg text-gray-600">
            ZKP Circuit Analysis and Management Tool
          </p>
        </header>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyze">Analyze Circuit</TabsTrigger>
            <TabsTrigger value="results">View Results</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          {/* Analyze Circuit Tab */}
          <TabsContent value="analyze" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Circuit Analysis
                </CardTitle>
                <CardDescription>
                  Upload your Circom circuit code or file to analyze constraints
                  and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="circuit-name">Circuit Name</Label>
                    <Input
                      id="circuit-name"
                      placeholder="Enter circuit name"
                      value={circuitName}
                      onChange={(e) => setCircuitName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="optimization">Optimization Level</Label>
                    <Select
                      value={optimizationLevel}
                      onValueChange={setOptimizationLevel}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-O0">
                          -O0 (No optimization)
                        </SelectItem>
                        <SelectItem value="-O1">-O1 (Default)</SelectItem>
                        <SelectItem value="-O2">-O2 (Maximum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload Circuit File (.circom)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".circom"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSampleCircuit}
                      type="button"
                    >
                      Load Sample
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setCircuitCode("");
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      type="button"
                    >
                      Clear File
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="circuit-code">Or Paste Circuit Code</Label>
                  <Textarea
                    id="circuit-code"
                    placeholder="Paste your Circom circuit code here..."
                    value={circuitCode}
                    onChange={(e) => setCircuitCode(e.target.value)}
                    className="min-h-[300px] font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Choose optional logs to display</Label>
                  <div className="flex gap-4">
                    {/* <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedLogs.includes("constraints")}
                        onCheckedChange={() => handleLogChange("constraints")}
                        id="log-constraints"
                      />
                      <Label htmlFor="log-constraints">Constraints</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedLogs.includes("compilation_time")}
                        onCheckedChange={() =>
                          handleLogChange("compilation_time")
                        }
                        id="log-compilation"
                      />
                      <Label htmlFor="log-compilation">Compilation Time</Label>
                    </div> */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedLogs.includes("proof_time")}
                        onCheckedChange={() => handleLogChange("proof_time")}
                        id="log-proof"
                      />
                      <Label htmlFor="log-proof">Proof Time</Label>
                    </div>
                  </div>
                </div>

                {selectedLogs.includes("proof_time") && (
                  <div className="space-y-2">
                    <Label>Upload or paste input for proof generation</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={handleProofInputFile}
                        ref={proofInputFileRef}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofInput(sampleProofInput);
                          setProofInputFile(null);
                          if (proofInputFileRef.current)
                            proofInputFileRef.current.value = "";
                        }}
                        type="button"
                      >
                        Load Sample
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofInputFile(null);
                          setProofInput("");
                          if (proofInputFileRef.current)
                            proofInputFileRef.current.value = "";
                        }}
                        type="button"
                      >
                        Clear File
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Paste your input JSON here..."
                      value={proofInput}
                      onChange={(e) => setProofInput(e.target.value)}
                      className="min-h-[120px] font-mono"
                    />
                  </div>
                )}

                <Button
                  onClick={analyzeCircuit}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Analyzing..." : "Analyze Circuit"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* View Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={showAllVersions}
                    onCheckedChange={setShowAllVersions}
                  />
                  Show all versions
                </label>
                <Button variant="outline" onClick={fetchCircuits}>
                  Refresh
                </Button>
              </div>
            </div>

            {circuits.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No circuits analyzed yet. Start by analyzing a circuit!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {Object.entries(
                  circuits.reduce((acc, circuit) => {
                    const key = `${circuit.name}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(circuit);
                    return acc;
                  }, {})
                )
                  .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
                  .map(([circuitName, circuitVersions]) => {
                    // Sort versions by created_at descending (newest first)
                    const sortedVersions = circuitVersions.sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    );

                    // If showAllVersions is false, only show the latest version for each optimization level
                    const displayVersions = showAllVersions
                      ? sortedVersions
                      : sortedVersions
                          .reduce((acc, version) => {
                            const existing = acc.find(
                              (v) =>
                                v.optimization_level ===
                                version.optimization_level
                            );
                            if (!existing) {
                              acc.push(version);
                            }
                            return acc;
                          }, [])
                          .sort((a, b) =>
                            a.optimization_level.localeCompare(
                              b.optimization_level
                            )
                          );

                    return (
                      <Card key={circuitName}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {circuitName}
                            <Badge variant="outline">
                              {showAllVersions
                                ? `${circuitVersions.length} total`
                                : `${displayVersions.length} optimization${
                                    displayVersions.length > 1 ? "s" : ""
                                  }`}
                            </Badge>
                            {!showAllVersions && (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600"
                              >
                                Latest Only
                              </Badge>
                            )}
                          </CardTitle>{" "}
                          <CardDescription>
                            {showAllVersions
                              ? `${circuitVersions.length} total analysis results`
                              : `Latest analysis: ${formatDateTime(
                                  displayVersions.sort(
                                    (a, b) =>
                                      new Date(b.created_at) -
                                      new Date(a.created_at)
                                  )[0]?.created_at
                                )}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4">
                            {displayVersions.map((circuit, index) => (
                              <div
                                key={`${circuit.name}-${circuit.optimization_level}-${circuit.created_at}-${index}`}
                                className="border rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={getOptimizationBadgeColor(
                                        circuit.optimization_level
                                      )}
                                    >
                                      {circuit.optimization_level}
                                    </Badge>
                                    {!showAllVersions && index === 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-blue-600 border-blue-600 text-xs"
                                      >
                                        Latest
                                      </Badge>
                                    )}
                                  </div>{" "}
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                      {formatDateTime(circuit.created_at)}
                                    </span>
                                    {/*<Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        deleteCircuit(
                                          circuit.version_hash || circuit.id
                                        )
                                      }
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>*/}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-xl font-bold text-blue-600">
                                      {(
                                        circuit.total_constraints || 0
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-blue-800">
                                      Total Constraints
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-xl font-bold text-green-600">
                                      {(
                                        circuit.linear_constraints || 0
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-green-800">
                                      Linear
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-xl font-bold text-orange-600">
                                      {(
                                        circuit.nonlinear_constraints || 0
                                      ).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-orange-800">
                                      Non-linear
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                    <div>
                                      <div className="font-medium text-sm">
                                        Compilation Time
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {circuit.compilation_time !== undefined
                                          ? formatTime(circuit.compilation_time)
                                          : "N/A"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                    <Zap className="h-4 w-4 text-gray-600" />
                                    <div>
                                      <div className="font-medium text-sm">
                                        Proof Generation Time
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {circuit.proof_generation_time !==
                                        undefined
                                          ? formatTime(
                                              circuit.proof_generation_time
                                            )
                                          : "Not measured"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Dashboard
                </CardTitle>
                <CardDescription>
                  Select a circuit to view all related metrics about comparing
                  constraints and proof generation time across optimization
                  levels and frequency charts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label className="mb-2 block">Choose circuit</Label>
                  <Select
                    value={selectedDashboardCircuit}
                    onValueChange={setSelectedDashboardCircuit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select circuit" />
                    </SelectTrigger>
                    <SelectContent>
                      {circuitNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDashboardCircuit && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Total Constraints */}
                    <div>
                      <h3 className="font-semibold mb-2">Total Constraints</h3>
                      <Bar
                        data={{
                          labels: levels,
                          datasets: [
                            {
                              label: "Total Constraints",
                              data: constraints,
                              backgroundColor: [
                                "#f87171",
                                "#fbbf24",
                                "#34d399",
                              ],
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    </div>
                    {/* Linear & Non-linear Constraints */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Linear & Non-linear Constraints
                      </h3>
                      <Bar
                        data={{
                          labels: levels,
                          datasets: [
                            {
                              label: "Linear",
                              data: linearConstraints,
                              backgroundColor: "#60a5fa",
                            },
                            {
                              label: "Non-linear",
                              data: nonlinearConstraints,
                              backgroundColor: "#f472b6",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: true } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    </div>
                    {/* Proof Generation Time */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Proof Generation Time (s)
                      </h3>
                      <Bar
                        data={{
                          labels: levels,
                          datasets: [
                            {
                              label: "Proof Time (s)",
                              data: proofTimes,
                              backgroundColor: [
                                "#818cf8",
                                "#fbbf24",
                                "#34d399",
                              ],
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    </div>
                    {/* Compile Frequency */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Compile Frequency (Last 7 Days)
                      </h3>
                      <Line
                        data={{
                          labels: Object.keys(compileFreq),
                          datasets: [
                            {
                              label: "Compiles per hour",
                              data: Object.values(compileFreq),
                              borderColor: "#60a5fa",
                              backgroundColor: "rgba(96,165,250,0.2)",
                              tension: 0.3,
                              fill: true,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { 
                            y: { 
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                  return Number.isInteger(value) ? value : '';
                                }
                              }
                            } 
                          },
                        }}
                      />
                    </div>
                    {/* Proof Frequency */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Proof Generation Frequency (Last 7 Days)
                      </h3>
                      <Line
                        data={{
                          labels: Object.keys(proofFreq),
                          datasets: [
                            {
                              label: "Proofs per hour",
                              data: Object.values(proofFreq),
                              borderColor: "#f472b6",
                              backgroundColor: "rgba(244,114,182,0.2)",
                              tension: 0.3,
                              fill: true,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { 
                            y: { 
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                  return Number.isInteger(value) ? value : '';
                                }
                              }
                            } 
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
