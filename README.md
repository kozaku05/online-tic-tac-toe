# online-tic-tac-toe

https://kozaku05.f5.si
mysql> desc users;
+-------+-------------+------+-----+---------+----------------+
| Field | Type | Null | Key | Default | Extra |
+-------+-------------+------+-----+---------+----------------+
| id | int | NO | PRI | NULL | auto_increment |
| pass | char(60) | NO | | NULL | |
| name | varchar(10) | NO | | NULL | |
| RP | bigint | YES | | 0 | |
| token | varchar(40) | NO | | NULL | |
| win | int | NO | | 0 | |
| lose | int | NO | | 0 | |
| draw | int | NO | | 0 | |
+-------+-------------+------+-----+---------+----------------+
8 rows in set (0.05 sec)
