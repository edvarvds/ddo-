const fetch = require('node-fetch');

async function makeRequest() {
  try {
    const cpf = '07419326100'; // CPF que sabemos que funciona
    const url = `https://enccejainscricao.info/inscricao/api.php?cpf=${cpf}`;
    
    console.log('Fazendo requisição para:', url);
    
    const response = await fetch(url, {
      headers: {
        'Host': 'enccejainscricao.info',
        'Cookie': '_fbp=fb.1.1743555698304.770986604317181072',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Sec-Ch-Ua-Mobile': '?0',
        'Accept': '*/*',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://enccejainscricao.info/inscricao/index.html?utm_source=organicjLj67ec8be9f7645683b1483f88&utm_campaign=&utm_medium=&utm_content=&utm_term=&xcod=organicjLj67ec8be9f7645683b1483f88hQwK21wXxRhQwK21wXxRhQwK21wXxRhQwK21wXxR&sck=organicjLj67ec8be9f7645683b1483f88hQwK21wXxRhQwK21wXxRhQwK21wXxRhQwK21wXxR',
        'Accept-Encoding': 'gzip, deflate, br',
        'Priority': 'u=1, i'
      }
    });

    console.log('Status da resposta:', response.status);
    const data = await response.json();
    console.log('Resposta completa:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro:', error);
  }
}

makeRequest(); 