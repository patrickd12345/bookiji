import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  thresholds: { 
    http_req_duration: ['p(95)<800'], 
    http_req_failed: ['rate<0.01'] 
  },
  stages: [ 
    { duration: '1m', target: 20 }, 
    { duration: '3m', target: 50 }, 
    { duration: '1m', target: 0 } 
  ],
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/`);
  check(res, { 'status is 200': r => r.status === 200 });
  sleep(1);
}

