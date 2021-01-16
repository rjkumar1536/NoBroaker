const show = document.querySelector('#submit-btn');
const selected = document.querySelector('#user-select');
const userName = document.querySelector('#user-name');
const balance = document.querySelector('#user-balance');

const loader = document.querySelector('.loader-view');

async function fetchAPI(value , page = 1){
    let res  = await fetch(`https://jsonmock.hackerrank.com/api/transactions?userId=${value}&page=${page}`);
    let data = await res.json();
    return data;
}
async function getData(value){
    let result = await fetchAPI(value);
    let n = result.total_pages;
    result = result.data;
    for(let i = 2; i <= n;i++){
        let res = await fetchAPI(value, i);
        result = [...result, ...res.data];
    }
    return result;
}

async function loadData(value){
    let data = await getData(value);
    userName.innerText = selected.options[selected.selectedIndex].text;
    let obj = {};
    let total_balance = 0;
    var formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    for(let i = 0; i < data.length; i++){
        var d = new Date(data[i].timestamp);
        let month = (d.getMonth()+1);
        if(month < 10){
            month = '0' + month;
        }
        let year = d.getFullYear();
        let key = `${month}-${year}`
        let str = data[i].amount;
        str = parseFloat(str.replace(',', '').slice(1));
        if(!obj[key]){
            obj[key] = {"credit" : 0, "debit" : 0 }
        }
        obj[key][data[i].txnType] += str;
        if(data[i].txnType == "debit"){
            total_balance -= str;
        }
        else{
            data[i].txtType += str;
        }
    }
    balance.innerText = `Balance : ${formatter.format(total_balance)}`
    let values = Object.entries(obj);
    values.sort((a,b) => a[0] < b[0] ? -1 : 1);
    for(let [key, value] of values){
        let div = document.createElement('div');
        div.classList.add('statement-card');
        let p1 = document.createElement('p');
        p1.classList.add('monthly-balance');
        p1.innerText = formatter.format(value.credit - value.debit);
        let p2 = document.createElement('p');
        p2.classList.add('month-year');
        p2.innerText = key;
        let p3 = document.createElement('p');
        p3.classList.add('monthly-credit');
        p3.innerText = `Credit : ${formatter.format(value.credit)}`
        let p4 = document.createElement('p');
        p4.classList.add('monthly-debit');
        p4.innerText = `Debit : ${formatter.format(value.debit)}`
        div.append(p1);
        div.append(p2);
        div.append(p3);
        div.append(p4);
        document.querySelector('#monthly-statements').append(div);
    }
    loader.classList.add('hide-loader');
}
show.addEventListener('click', ()=>{
    var value = selected.value;
    if(value != -1){
        loader.classList.remove('hide-loader');
        document.querySelector('#monthly-statements').innerHTML = '';
        userName.innerText = '';
        balance.innerText = '';
        loadData(value);
    }
})