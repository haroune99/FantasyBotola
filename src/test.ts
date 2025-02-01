import { forwardDataPromise, midfieldDataPromise, defenseGkDataPromise } from './data';

forwardDataPromise.then(fwd_data => {
  console.log('Forward Data:', fwd_data);
}).catch(error => {
  console.error('Error fetching forward data:', error);
});

midfieldDataPromise.then(midfield_data => {
  console.log('Midfield Data:', midfield_data);
}).catch(error => {
  console.error('Error fetching midfield data:', error);
});

defenseGkDataPromise.then(defense_gk_data => {
  console.log('Defense and GK Data:', defense_gk_data);
}).catch(error => {
  console.error('Error fetching defense and GK data:', error);
});