const fetch = require('node-fetch');

const url = 'https://enccejainscricao.info/inscricao/api.php?cpf=07419326100';

async function makeRequest() {
  try {
    console.log('Making request to:', url);
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

    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

makeRequest(); 