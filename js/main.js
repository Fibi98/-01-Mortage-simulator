import{calculateMortgage}from"./calculations/mortgage.js";
import{renderCharts}from"./components/charts.js";
import{formatCurrency,formatPercentage,formatCsvValue}from"./utils/formatters.js";
import{readSimulationInputs}from"./utils/validators.js";
const DEFAULTS={price:250000,down:50000,reno:10000,years:25,rate:3,agency:3,notary:3000,imu:0,condo:1200,maint:1,growth:2,invest:5,infl:2,horizon:30};
let tableData=[];
function showValidationMessage(message=""){document.getElementById("validation-message").textContent=message;}
function renderKpis({finalEquity,finalInvestment,cagrHouse,cagrInvestment}){
 const difference=finalEquity-finalInvestment;
 document.getElementById("kpis").innerHTML=`<div class="grid">
 <div class="kpi">🏠 Patrimonio immobiliare: ${formatCurrency(finalEquity)}</div>
 <div class="kpi">💰 Investimento alternativo: ${formatCurrency(finalInvestment)}</div>
 <div class="kpi">📊 Differenza: ${formatCurrency(difference)}</div>
 <div class="kpi">CAGR Casa: ${cagrHouse===null?"N/D":formatPercentage(cagrHouse)}</div>
 <div class="kpi">CAGR Investimento: ${cagrInvestment===null?"N/D":formatPercentage(cagrInvestment)}</div></div>`;
}
function renderTable(){
 const head=document.querySelector("#results thead"),body=document.querySelector("#results tbody");
 const headings=["Anno","Valore Immobile","Debito Residuo","Equity Casa","Costi Annuali","Rata Annua","Esborso Totale","Investimento"];
 head.replaceChildren();const headerRow=document.createElement("tr");
 headings.forEach(label=>{const cell=document.createElement("th");cell.textContent=label;headerRow.appendChild(cell);});head.appendChild(headerRow);
 body.replaceChildren();tableData.forEach(row=>{const tr=document.createElement("tr");row.forEach((value,index)=>{const td=document.createElement("td");td.textContent=index===0?String(value):formatCurrency(value);tr.appendChild(td);});body.appendChild(tr);});
}
function calculate(){
 showValidationMessage();
 try{
  const input=readSimulationInputs();
  const{price,down,years,rate,agency,notary,reno,imu,condo,maint,growth,invest,horizon}=input;
  const agencyCost=price*agency/100,loan=Math.max(0,price-down),mortgage=calculateMortgage(loan,rate,years);
  // La logica finanziaria originale è mantenuta in questa fase di refactoring.
  let investmentValue=down+agencyCost+notary+reno;
  tableData=[];const labels=[],equity=[],investment=[],homeValues=[],debt=[],costs=[];
  for(let year=1;year<=horizon;year++){
   const homeValue=price*Math.pow(1+growth/100,year);
   const scheduleRow=year<=mortgage.schedule.length?mortgage.schedule[year-1]:{balance:0};
   const balance=scheduleRow.balance||0,maintenanceCost=homeValue*maint/100;
   const annualCosts=imu+condo+maintenanceCost,annualMortgage=year<=years?mortgage.monthly*12:0,totalOut=annualCosts+annualMortgage;
   investmentValue*=1+invest/100;const homeEquity=homeValue-balance;
   tableData.push([year,homeValue,balance,homeEquity,annualCosts,annualMortgage,totalOut,investmentValue]);
   labels.push(year);equity.push(homeEquity);investment.push(investmentValue);homeValues.push(homeValue);debt.push(balance);costs.push(annualCosts);
  }
  const finalEquity=equity[equity.length-1],finalInvestment=investment[investment.length-1],initialCapital=down+agencyCost+notary+reno;
  const cagr=value=>initialCapital>0&&value>0?Math.pow(value/initialCapital,1/horizon)-1:null;
  renderKpis({finalEquity,finalInvestment,cagrHouse:cagr(finalEquity),cagrInvestment:cagr(finalInvestment)});
  renderTable();renderCharts({labels,equity,investment,homeValues,debt,costs});
 }catch(error){showValidationMessage(error.message);}
}
function exportCsv(){
 if(tableData.length===0){showValidationMessage("Calcola prima una simulazione da esportare.");return;}
 const headings=["Anno","Valore Immobile","Debito Residuo","Equity Casa","Costi Annuali","Rata Annua","Esborso Totale","Investimento"];
 const rows=[headings.map(formatCsvValue).join(";"),...tableData.map(row=>row.map(formatCsvValue).join(";"))];
 const blob=new Blob(["\\uFEFF"+rows.join("\\r\\n")],{type:"text/csv;charset=utf-8;"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="simulazione_casa.csv";link.click();URL.revokeObjectURL(url);
}
function resetInputs(){Object.entries(DEFAULTS).forEach(([id,value])=>{document.getElementById(id).value=value;});calculate();}
document.getElementById("calculate-button").addEventListener("click",calculate);
document.getElementById("reset-button").addEventListener("click",resetInputs);
document.getElementById("export-button").addEventListener("click",exportCsv);
calculate();